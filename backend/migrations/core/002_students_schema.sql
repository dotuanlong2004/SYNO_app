-- ============================================================
-- CORE SCHEMA: Student Management
-- Dependencies: 001_auth_schema.sql (for parent_id reference)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.students (
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
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view students" ON public.students;
CREATE POLICY "Anyone can view students" 
    ON public.students FOR SELECT 
    TO authenticated 
    USING (true);

DROP POLICY IF EXISTS "Teachers can manage students" ON public.students;
CREATE POLICY "Teachers can manage students" 
    ON public.students FOR ALL 
    TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_school ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_code ON public.students(student_code);
CREATE INDEX IF NOT EXISTS idx_students_parent ON public.students(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_name);
