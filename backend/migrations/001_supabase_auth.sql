-- Migration: Custom Auth -> Supabase Native Auth
-- Created: 2024

-- 1. Create user_profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('parent', 'teacher', 'admin')),
    class_id VARCHAR(64),
    student_code VARCHAR(64),
    fcm_token TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
CREATE POLICY "Users view own profile" 
    ON user_profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users update own profile" 
    ON user_profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Admins view all" 
    ON user_profiles FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- 4. Update students.parent_id to UUID
ALTER TABLE students 
    ALTER COLUMN parent_id TYPE UUID 
    USING parent_id::text::UUID;

-- 5. Update attendance_logs.created_by to UUID
ALTER TABLE attendance_logs 
    ALTER COLUMN created_by TYPE UUID 
    USING created_by::text::UUID;

-- 6. Update timetables.created_by to UUID  
ALTER TABLE timetables 
    ALTER COLUMN created_by TYPE UUID 
    USING created_by::text::UUID;

-- 7. Trigger: Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name, role, school_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'parent'),
        COALESCE(NEW.raw_user_meta_data->>'school_id', 'default_school')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8. Update RLS policies for students
DROP POLICY IF EXISTS "Parents can view linked students" ON students;
CREATE POLICY "Parents can view linked students" 
    ON students FOR SELECT 
    TO authenticated 
    USING (parent_id = auth.uid());

-- 9. Drop old tables (after confirming migration works)
-- DROP TABLE IF EXISTS user_refresh_tokens;
-- DROP TABLE IF EXISTS users;

-- 10. Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_school ON user_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id);
