-- Parent app advanced features: announcements, grades, and chat

CREATE TABLE IF NOT EXISTS public.announcements (
  id BIGSERIAL PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_general BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grade_records (
  id BIGSERIAL PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
  student_code VARCHAR(64) NOT NULL,
  subject_name VARCHAR(128) NOT NULL,
  midterm_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  final_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id BIGSERIAL PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
  student_code VARCHAR(64) NOT NULL,
  sender_role VARCHAR(32) NOT NULL,
  sender_id UUID,
  sender_name VARCHAR(128),
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_school_published
  ON public.announcements (school_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_grade_records_school_student
  ON public.grade_records (school_id, student_code);

CREATE INDEX IF NOT EXISTS idx_chat_messages_school_student_created
  ON public.chat_messages (school_id, student_code, created_at ASC);
