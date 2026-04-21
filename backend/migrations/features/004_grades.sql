-- ============================================================
-- FEATURE: Grades Management
-- Dependencies: core/002_students_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.grades (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
    student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject_name VARCHAR(128) NOT NULL,
    midterm_score DECIMAL(4, 2),
    final_score DECIMAL(4, 2),
    average_score DECIMAL(4, 2),
    semester VARCHAR(32) DEFAULT '1',
    academic_year VARCHAR(16) DEFAULT '2024-2025',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view grades" ON public.grades;
CREATE POLICY "Anyone can view grades" 
    ON public.grades FOR SELECT 
    TO authenticated 
    USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grades_school ON public.grades(school_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON public.grades(subject_name);
