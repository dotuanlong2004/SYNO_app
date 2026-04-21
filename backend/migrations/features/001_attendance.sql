-- ============================================================
-- FEATURE: Attendance Management
-- Dependencies: core/002_students_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
    student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ NOT NULL,
    log_type VARCHAR(32) NOT NULL CHECK (log_type IN ('check_in', 'check_out')),
    status_detail VARCHAR(32) NOT NULL CHECK (status_detail IN ('on_time', 'late', 'leave')),
    late_minutes INTEGER CHECK (late_minutes IS NULL OR late_minutes >= 0),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spam protection tables
CREATE TABLE IF NOT EXISTS public.attendance_spam_logs (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL,
    student_code VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    UNIQUE(school_id, student_code)
);

CREATE TABLE IF NOT EXISTS public.hardware_scan_debounce (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL,
    student_code VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    UNIQUE(school_id, student_code)
);

-- Enable RLS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view attendance" ON public.attendance_logs;
CREATE POLICY "Anyone can view attendance" 
    ON public.attendance_logs FOR SELECT 
    TO authenticated 
    USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_school ON public.attendance_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_scanned ON public.attendance_logs(scanned_at);
