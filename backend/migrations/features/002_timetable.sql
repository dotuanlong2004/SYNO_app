-- ============================================================
-- FEATURE: Timetable Management
-- Dependencies: core/001_auth_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.timetables (
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
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view timetables" ON public.timetables;
CREATE POLICY "Anyone can view timetables" 
    ON public.timetables FOR SELECT 
    TO authenticated 
    USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_timetables_school ON public.timetables(school_id);
CREATE INDEX IF NOT EXISTS idx_timetables_class ON public.timetables(class_id);
CREATE INDEX IF NOT EXISTS idx_timetables_day ON public.timetables(day_of_week);
