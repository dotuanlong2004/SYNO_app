-- Add timetable metadata fields and fee notices table for admin dashboard

ALTER TABLE IF EXISTS public.timetables
  ADD COLUMN IF NOT EXISTS teacher_name TEXT;

ALTER TABLE IF EXISTS public.timetables
  ADD COLUMN IF NOT EXISTS period TEXT;

CREATE TABLE IF NOT EXISTS public.fee_notices (
  id BIGSERIAL PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
  student_code VARCHAR(64) NOT NULL,
  class_id VARCHAR(64),
  subject_fees JSONB NOT NULL DEFAULT '{}'::jsonb,
  other_fees JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(16) NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  payment_method VARCHAR(16)
    CHECK (payment_method IN ('online', 'cash')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_notices_school_student
  ON public.fee_notices (school_id, student_code);

CREATE INDEX IF NOT EXISTS idx_fee_notices_created_at
  ON public.fee_notices (created_at DESC);
