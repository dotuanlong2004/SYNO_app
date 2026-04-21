-- ============================================================
-- CORE SCHEMA: Authentication & User Management
-- Run first: Creates foundation tables for auth
-- Dependencies: None (uses auth.users from Supabase)
-- ============================================================

-- User profiles extension table
-- Links to auth.users for app-specific data
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
    full_name VARCHAR(255) NOT NULL DEFAULT 'User',
    role VARCHAR(32) NOT NULL DEFAULT 'parent' 
        CHECK (role IN ('parent', 'teacher', 'admin')),
    class_id VARCHAR(64),
    student_code VARCHAR(64),
    fcm_token TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users view own profile" ON public.user_profiles;
CREATE POLICY "Users view own profile" 
    ON public.user_profiles FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.user_profiles;
CREATE POLICY "Users update own profile" 
    ON public.user_profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Trigger: Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name, role, school_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'parent'),
        COALESCE(NEW.raw_user_meta_data->>'school_id', 'default_school')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_school ON public.user_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
