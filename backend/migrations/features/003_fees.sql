-- ============================================================
-- FEATURE: Student Fees Management
-- Dependencies: core/002_students_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.student_fees (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
    student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id VARCHAR(64),
    subject_fees JSONB DEFAULT '[]'::jsonb,
    other_fees JSONB DEFAULT '[]'::jsonb,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(32) NOT NULL DEFAULT 'pending' 
        CHECK (payment_status IN ('pending', 'partial', 'paid')),
    payment_method VARCHAR(64),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view fees" ON public.student_fees;
CREATE POLICY "Anyone can view fees" 
    ON public.student_fees FOR SELECT 
    TO authenticated 
    USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fees_school ON public.student_fees(school_id);
CREATE INDEX IF NOT EXISTS idx_fees_student ON public.student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_status ON public.student_fees(payment_status);
