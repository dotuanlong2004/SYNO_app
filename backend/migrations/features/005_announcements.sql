-- ============================================================
-- FEATURE: Announcements & News
-- Dependencies: core/002_students_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.announcements (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
    title VARCHAR(255) NOT NULL,
    content TEXT,
    class_id VARCHAR(64),
    student_id BIGINT REFERENCES public.students(id) ON DELETE CASCADE,
    is_general BOOLEAN DEFAULT FALSE,
    priority VARCHAR(32) DEFAULT 'normal' 
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;
CREATE POLICY "Anyone can view announcements" 
    ON public.announcements FOR SELECT 
    TO authenticated 
    USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_school ON public.announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_announcements_general ON public.announcements(is_general);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.announcements(created_at);
