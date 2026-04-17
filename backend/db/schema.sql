-- Student Attendance System — PostgreSQL schema
-- Run: psql -U postgres -d attendance_db -f db/schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS students (
    id              BIGSERIAL PRIMARY KEY,
    school_id       VARCHAR(64) NOT NULL DEFAULT 'default_school',
    student_code    VARCHAR(64) NOT NULL UNIQUE,
    full_name       VARCHAR(255) NOT NULL DEFAULT '',
    class_name      VARCHAR(128),
    link_code       VARCHAR(128) UNIQUE,
    parent_id       BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) NOT NULL DEFAULT 'default_school';
CREATE INDEX IF NOT EXISTS idx_students_student_code ON students (student_code);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students (school_id);

CREATE TABLE IF NOT EXISTS attendance_logs (
    id              BIGSERIAL PRIMARY KEY,
    school_id       VARCHAR(64) NOT NULL DEFAULT 'default_school',
    student_id      BIGINT NOT NULL REFERENCES students (id) ON DELETE CASCADE,
    scanned_at      TIMESTAMPTZ NOT NULL,
    log_type        VARCHAR(32) NOT NULL CHECK (log_type IN ('check_in', 'check_out')),
    status_detail   VARCHAR(32) NOT NULL CHECK (
                        status_detail IN ('on_time', 'late', 'leave')
                    ),
    late_minutes    INTEGER CHECK (late_minutes IS NULL OR late_minutes >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) NOT NULL DEFAULT 'default_school';
CREATE INDEX IF NOT EXISTS idx_attendance_logs_student_id ON attendance_logs (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_school_id ON attendance_logs (school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_scanned_at ON attendance_logs (scanned_at);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_student_scanned ON attendance_logs (student_id, scanned_at);

-- Mobile users (parents/teachers)
CREATE TABLE IF NOT EXISTS users (
    id                BIGSERIAL PRIMARY KEY,
    school_id         VARCHAR(64) NOT NULL DEFAULT 'default_school',
    email             VARCHAR(255) NOT NULL UNIQUE,
    password_hash     TEXT NOT NULL,
    full_name         VARCHAR(255) NOT NULL,
    role              VARCHAR(32) NOT NULL CHECK (role IN ('parent', 'teacher', 'admin')),
    class_id          VARCHAR(64),
    student_code      VARCHAR(64),
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    fcm_token         TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- For older DBs created before fcm_token was added.
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_id VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_code VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) NOT NULL DEFAULT 'default_school';

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users (school_id);
CREATE INDEX IF NOT EXISTS idx_users_class_id ON users (class_id);
CREATE INDEX IF NOT EXISTS idx_users_student_code ON users (student_code);

CREATE TABLE IF NOT EXISTS user_refresh_tokens (
    id                  BIGSERIAL PRIMARY KEY,
    school_id           VARCHAR(64) NOT NULL DEFAULT 'default_school',
    user_id             BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash          TEXT NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    revoked_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_refresh_tokens ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) NOT NULL DEFAULT 'default_school';
CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_user_id ON user_refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_school_id ON user_refresh_tokens (school_id);
CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_expires_at ON user_refresh_tokens (expires_at);

ALTER TABLE students ADD COLUMN IF NOT EXISTS link_code VARCHAR(128);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_id BIGINT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_link_code_unique ON students (link_code);
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON students (parent_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_students_parent_id_users'
      AND table_name = 'students'
  ) THEN
    ALTER TABLE students
    ADD CONSTRAINT fk_students_parent_id_users
      FOREIGN KEY (parent_id)
      REFERENCES users (id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS timetables (
    id              BIGSERIAL PRIMARY KEY,
    school_id       VARCHAR(64) NOT NULL DEFAULT 'default_school',
    class_id        VARCHAR(64) NOT NULL,
    subject_name    VARCHAR(255) NOT NULL,
    day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    room            VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (start_time < end_time)
);

ALTER TABLE timetables ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) NOT NULL DEFAULT 'default_school';
CREATE INDEX IF NOT EXISTS idx_timetables_class_day_start
ON timetables (class_id, day_of_week, start_time);
CREATE INDEX IF NOT EXISTS idx_timetables_school_class_day_start
ON timetables (school_id, class_id, day_of_week, start_time);

COMMENT ON TABLE students IS 'Registered students; student_code is the ID sent by hardware.';
COMMENT ON TABLE attendance_logs IS 'Persisted attendance after Redis queue processing.';
COMMENT ON COLUMN attendance_logs.late_minutes IS 'Minutes late for check_in when status_detail = late; NULL otherwise.';
COMMENT ON TABLE users IS 'Mobile app users (parents/teachers/admin).';
COMMENT ON TABLE user_refresh_tokens IS 'Hashed refresh tokens for JWT rotation and revocation.';
COMMENT ON TABLE timetables IS 'Weekly timetable by class.';
