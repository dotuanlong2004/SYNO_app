
-- ============================================================
-- AUTO MIGRATION: Custom Auth → Supabase Native Auth
-- Generated: 2026-04-17T03:19:36.714Z
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USER PROFILES TABLE (extends auth.users)
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

-- Enable RLS
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
DROP POLICY IF EXISTS "Users view own profile" ON user_profiles;
CREATE POLICY "Users view own profile" 
    ON user_profiles FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON user_profiles;
CREATE POLICY "Users update own profile" 
    ON user_profiles FOR UPDATE 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins view all" ON user_profiles;
CREATE POLICY "Admins view all" 
    ON user_profiles FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- 2. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
    student_code VARCHAR(64) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL DEFAULT '',
    class_name VARCHAR(128),
    link_code VARCHAR(128) UNIQUE,
    parent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;

-- RLS Policies for students
DROP POLICY IF EXISTS "Anyone can view students" ON students;
CREATE POLICY "Anyone can view students" 
    ON students FOR SELECT 
    TO authenticated 
    USING (true);

DROP POLICY IF EXISTS "Teachers/admins can manage students" ON students;
CREATE POLICY "Teachers/admins can manage students" 
    ON students FOR ALL 
    TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role IN ('teacher', 'admin')
    ));

DROP POLICY IF EXISTS "Parents can view linked students" ON students;
CREATE POLICY "Parents can view linked students" 
    ON students FOR SELECT 
    TO authenticated 
    USING (parent_id = auth.uid());

-- 3. ATTENDANCE LOGS TABLE
CREATE TABLE IF NOT EXISTS attendance_logs (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ NOT NULL,
    log_type VARCHAR(32) NOT NULL CHECK (log_type IN ('check_in', 'check_out')),
    status_detail VARCHAR(32) NOT NULL CHECK (status_detail IN ('on_time', 'late', 'leave')),
    late_minutes INTEGER CHECK (late_minutes IS NULL OR late_minutes >= 0),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE IF EXISTS attendance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view attendance logs" ON attendance_logs;
CREATE POLICY "Anyone can view attendance logs" 
    ON attendance_logs FOR SELECT 
    TO authenticated 
    USING (true);

-- 4. TIMETABLES TABLE
CREATE TABLE IF NOT EXISTS timetables (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
    class_id VARCHAR(64) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(64),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (start_time < end_time)
);

-- Enable RLS
ALTER TABLE IF EXISTS timetables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view timetables" ON timetables;
CREATE POLICY "Anyone can view timetables" 
    ON timetables FOR SELECT 
    TO authenticated 
    USING (true);

DROP POLICY IF EXISTS "Teachers/admins can manage timetables" ON timetables;
CREATE POLICY "Teachers/admins can manage timetables" 
    ON timetables FOR ALL 
    TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role IN ('teacher', 'admin')
    ));

-- 5. SPAM PROTECTION TABLES
CREATE TABLE IF NOT EXISTS attendance_spam_logs (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL,
    student_code VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    UNIQUE(school_id, student_code)
);

CREATE TABLE IF NOT EXISTS hardware_scan_debounce (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL,
    student_code VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    UNIQUE(school_id, student_code)
);

-- 6. TRIGGER: Auto-create profile on user signup
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

-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_code ON students(student_code);
CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_link_code ON students(link_code);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_school ON attendance_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_student ON attendance_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_scanned ON attendance_logs(scanned_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_school ON user_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- 8. SEED DATA (optional test data)
-- Insert a test student if none exists
INSERT INTO students (student_code, full_name, class_name, link_code, school_id)
SELECT 'TEST001', 'Nguyễn Văn Test', '10A1', 'LINK123', 'default_school'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE student_code = 'TEST001');

-- Insert test timetable data
INSERT INTO timetables (school_id, class_id, subject_name, day_of_week, start_time, end_time, room)
SELECT 'default_school', '10A1', 'Toán', 1, '07:30', '08:15', '101'
WHERE NOT EXISTS (SELECT 1 FROM timetables WHERE class_id = '10A1' AND day_of_week = 1);

INSERT INTO timetables (school_id, class_id, subject_name, day_of_week, start_time, end_time, room)
SELECT 'default_school', '10A1', 'Lý', 1, '08:20', '09:05', '102'
WHERE NOT EXISTS (SELECT 1 FROM timetables WHERE class_id = '10A1' AND day_of_week = 1 AND subject_name = 'Lý');

-- Migration completed marker
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
END $$;
