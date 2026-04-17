-- ============================================================
-- SUPABASE SCHEMA - Attendance Management System
-- Project: School Attendance & Parent App
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- TABLES
-- ============================================================

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
    student_code VARCHAR(64) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL DEFAULT '',
    class_name VARCHAR(128),
    link_code VARCHAR(128) UNIQUE,
    parent_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table (parents/teachers/admins)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('parent', 'teacher', 'admin')),
    class_id VARCHAR(64),
    student_code VARCHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    fcm_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attendance logs
CREATE TABLE IF NOT EXISTS attendance_logs (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ NOT NULL,
    log_type VARCHAR(32) NOT NULL CHECK (log_type IN ('check_in', 'check_out')),
    status_detail VARCHAR(32) NOT NULL CHECK (status_detail IN ('on_time', 'late', 'leave')),
    late_minutes INTEGER CHECK (late_minutes IS NULL OR late_minutes >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User refresh tokens
CREATE TABLE IF NOT EXISTS user_refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Timetables
CREATE TABLE IF NOT EXISTS timetables (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL DEFAULT 'default_school',
    class_id VARCHAR(64) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (start_time < end_time)
);

-- ============================================================
-- SPAM PROTECTION & DEBOUNCE TABLES (Replace Redis)
-- ============================================================

-- Spam protection for attendance sync (10 minute TTL)
CREATE TABLE IF NOT EXISTS attendance_spam_logs (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL,
    student_code VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    UNIQUE(school_id, student_code)
);

-- Hardware scan debounce (5 minute TTL)
CREATE TABLE IF NOT EXISTS hardware_scan_debounce (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(64) NOT NULL,
    student_code VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    UNIQUE(school_id, student_code)
);

-- pg-boss job queue table (automatically created by pg-boss, but we ensure schema)
-- pg-boss will create its own tables: job, archive, schedule, etc.

-- ============================================================
-- INDEXES
-- ============================================================

-- Students indexes
CREATE INDEX IF NOT EXISTS idx_students_student_code ON students(student_code);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_link_code ON students(link_code);
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON students(parent_id);

-- Attendance logs indexes
CREATE INDEX IF NOT EXISTS idx_attendance_logs_student_id ON attendance_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_school_id ON attendance_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_scanned_at ON attendance_logs(scanned_at);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_student_scanned ON attendance_logs(student_id, scanned_at);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_class_id ON users(class_id);
CREATE INDEX IF NOT EXISTS idx_users_student_code ON users(student_code);

-- Refresh tokens indexes
CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_user_id ON user_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_token_hash ON user_refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_expires_at ON user_refresh_tokens(expires_at);

-- Timetables indexes
CREATE INDEX IF NOT EXISTS idx_timetables_class_day_start ON timetables(class_id, day_of_week, start_time);
CREATE INDEX IF NOT EXISTS idx_timetables_school_class_day ON timetables(school_id, class_id, day_of_week);

-- Spam/debounce indexes (with partial index for active records)
CREATE INDEX IF NOT EXISTS idx_spam_logs_school_student ON attendance_spam_logs(school_id, student_code);
CREATE INDEX IF NOT EXISTS idx_spam_logs_expires ON attendance_spam_logs(expires_at);
CREATE INDEX IF NOT EXISTS idx_scan_debounce_school_student ON hardware_scan_debounce(school_id, student_code);
CREATE INDEX IF NOT EXISTS idx_scan_debounce_expires ON hardware_scan_debounce(expires_at);

-- ============================================================
-- FOREIGN KEYS (Explicit)
-- ============================================================

ALTER TABLE students 
    ADD CONSTRAINT fk_students_parent_id_users 
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_spam_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_scan_debounce ENABLE ROW LEVEL SECURITY;

-- Create policies (service_role can bypass, anon/authenticated need policies)
CREATE POLICY "Service role bypass" ON students FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON attendance_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON user_refresh_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON timetables FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON attendance_spam_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON hardware_scan_debounce FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow authenticated users to read their own data
CREATE POLICY "Users can view own school students" ON students
    FOR SELECT TO authenticated
    USING (school_id = COALESCE(current_setting('request.jwt.claims', true)::json->>'school_id', 'default_school'));

-- ============================================================
-- RPC FUNCTIONS (For Complex Transactions)
-- ============================================================

-- Function: Register parent and link to student (Atomic transaction)
CREATE OR REPLACE FUNCTION register_parent_and_link(
    p_full_name TEXT,
    p_identifier TEXT,
    p_password_hash TEXT,
    p_student_link_code TEXT,
    p_school_id TEXT DEFAULT 'default_school'
)
RETURNS TABLE (
    parent_id BIGINT,
    parent_email TEXT,
    student_code TEXT,
    student_full_name TEXT,
    success BOOLEAN,
    error_message TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_student RECORD;
    v_parent_id BIGINT;
    v_parent_email TEXT;
BEGIN
    -- Find student by link code
    SELECT s.id, s.student_code, s.full_name, s.parent_id
    INTO v_student
    FROM students s
    WHERE s.link_code = p_student_link_code AND s.school_id = p_school_id
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE, 'Invalid student link code';
        RETURN;
    END IF;
    
    IF v_student.parent_id IS NOT NULL THEN
        RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE, 'Student already linked to parent';
        RETURN;
    END IF;
    
    -- Create parent user
    INSERT INTO users (email, password_hash, full_name, role, class_id, student_code, school_id)
    VALUES (p_identifier, p_password_hash, p_full_name, 'parent', NULL, v_student.student_code, p_school_id)
    RETURNING users.id, users.email INTO v_parent_id, v_parent_email;
    
    -- Link student to parent
    UPDATE students 
    SET parent_id = v_parent_id, updated_at = NOW()
    WHERE id = v_student.id;
    
    RETURN QUERY SELECT v_parent_id, v_parent_email, v_student.student_code, v_student.full_name, TRUE, NULL::TEXT;
END;
$$;

-- Function: Provision parent account (Admin/Teacher creates parent)
CREATE OR REPLACE FUNCTION provision_parent_account(
    p_student_id BIGINT,
    p_parent_name TEXT,
    p_parent_identifier TEXT,
    p_password_hash TEXT,
    p_school_id TEXT DEFAULT 'default_school'
)
RETURNS TABLE (
    parent_id BIGINT,
    parent_email TEXT,
    parent_full_name TEXT,
    student_code TEXT,
    success BOOLEAN,
    error_message TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_student RECORD;
    v_parent_id BIGINT;
BEGIN
    -- Get student
    SELECT s.id, s.student_code, s.full_name, s.class_name, s.parent_id
    INTO v_student
    FROM students s
    WHERE s.id = p_student_id AND s.school_id = p_school_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE, 'Student not found';
        RETURN;
    END IF;
    
    IF v_student.parent_id IS NOT NULL THEN
        RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE, 'Student already linked';
        RETURN;
    END IF;
    
    -- Create parent
    INSERT INTO users (email, password_hash, full_name, role, class_id, student_code, school_id)
    VALUES (p_parent_identifier, p_password_hash, p_parent_name, 'parent', v_student.class_name, v_student.student_code, p_school_id)
    RETURNING users.id, users.email, users.full_name INTO v_parent_id, parent_email, parent_full_name;
    
    -- Link student
    UPDATE students SET parent_id = v_parent_id, updated_at = NOW() WHERE id = v_student.id;
    
    RETURN QUERY SELECT v_parent_id, parent_email, parent_full_name, v_student.student_code, TRUE, NULL::TEXT;
END;
$$;

-- Function: Record attendance with spam check
CREATE OR REPLACE FUNCTION record_attendance_with_spam_check(
    p_student_code TEXT,
    p_school_id TEXT,
    p_scanned_at TIMESTAMPTZ,
    p_log_type TEXT,
    p_status_detail TEXT,
    p_late_minutes INTEGER DEFAULT NULL
)
RETURNS TABLE (
    log_id BIGINT,
    student_id BIGINT,
    blocked BOOLEAN,
    error_message TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_student RECORD;
    v_last_log RECORD;
    v_next_log_type TEXT;
    v_status TEXT;
    v_log_id BIGINT;
    v_spam_exists BOOLEAN;
BEGIN
    -- Check spam (10 min window)
    SELECT EXISTS(
        SELECT 1 FROM attendance_spam_logs 
        WHERE school_id = p_school_id AND student_code = p_student_code
        AND expires_at > NOW()
    ) INTO v_spam_exists;
    
    IF v_spam_exists THEN
        RETURN QUERY SELECT NULL::BIGINT, NULL::BIGINT, TRUE, 'Spam blocked (< 10 minutes)';
        RETURN;
    END IF;
    
    -- Find student
    SELECT id, full_name INTO v_student
    FROM students 
    WHERE student_code = p_student_code AND school_id = p_school_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::BIGINT, NULL::BIGINT, FALSE, 'Student not found';
        RETURN;
    END IF;
    
    -- Determine check_in/check_out if not provided
    IF p_log_type IS NULL THEN
        SELECT log_type INTO v_last_log
        FROM attendance_logs
        WHERE school_id = p_school_id AND student_id = v_student.id
        AND scanned_at >= DATE_TRUNC('day', p_scanned_at)
        AND scanned_at < DATE_TRUNC('day', p_scanned_at) + INTERVAL '1 day'
        ORDER BY scanned_at DESC
        LIMIT 1;
        
        IF v_last_log.log_type = 'check_in' THEN
            v_next_log_type := 'check_out';
            v_status := 'leave';
        ELSE
            v_next_log_type := 'check_in';
            v_status := 'on_time';
        END IF;
    ELSE
        v_next_log_type := p_log_type;
        v_status := p_status_detail;
    END IF;
    
    -- Insert spam record
    INSERT INTO attendance_spam_logs (school_id, student_code, expires_at)
    VALUES (p_school_id, p_student_code, NOW() + INTERVAL '10 minutes')
    ON CONFLICT (school_id, student_code) DO UPDATE SET created_at = NOW(), expires_at = NOW() + INTERVAL '10 minutes';
    
    -- Insert attendance log
    INSERT INTO attendance_logs (school_id, student_id, scanned_at, log_type, status_detail, late_minutes)
    VALUES (p_school_id, v_student.id, p_scanned_at, v_next_log_type, v_status, p_late_minutes)
    RETURNING id INTO v_log_id;
    
    RETURN QUERY SELECT v_log_id, v_student.id, FALSE, NULL::TEXT;
END;
$$;

-- Function: Upsert student from hardware scan (auto-create if not exists)
CREATE OR REPLACE FUNCTION upsert_student_from_scan(
    p_school_id TEXT,
    p_student_code TEXT,
    p_full_name TEXT DEFAULT 'Pending registration'
)
RETURNS TABLE (
    student_id BIGINT,
    student_code TEXT,
    is_new BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_id BIGINT;
    v_is_new BOOLEAN := FALSE;
    v_default_link TEXT;
BEGIN
    v_default_link := 'LK-' || p_student_code;
    
    -- Try to get existing
    SELECT id INTO v_id FROM students WHERE students.student_code = p_student_code;
    
    IF NOT FOUND THEN
        -- Create new
        INSERT INTO students (school_id, student_code, full_name, link_code)
        VALUES (p_school_id, p_student_code, p_full_name, v_default_link)
        RETURNING id INTO v_id;
        v_is_new := TRUE;
    ELSE
        -- Update link_code if null
        UPDATE students SET link_code = COALESCE(link_code, v_default_link), updated_at = NOW()
        WHERE id = v_id;
    END IF;
    
    RETURN QUERY SELECT v_id, p_student_code, v_is_new;
END;
$$;

-- Function: Get parent FCM tokens for student
CREATE OR REPLACE FUNCTION get_parent_fcm_tokens(
    p_student_code TEXT,
    p_school_id TEXT
)
RETURNS TABLE (
    user_id BIGINT,
    fcm_token TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
    SELECT u.id, u.fcm_token
    FROM users u
    WHERE u.student_code = p_student_code
    AND u.school_id = p_school_id
    AND u.is_active = TRUE
    AND u.fcm_token IS NOT NULL
    AND u.fcm_token <> '';
$$;

-- ============================================================
-- PG-CRON JOBS (Automated Cleanup)
-- ============================================================

-- Schedule cleanup of expired spam logs (every 10 minutes)
SELECT cron.schedule(
    'cleanup-attendance-spam-logs',
    '*/10 * * * *',
    $$DELETE FROM attendance_spam_logs WHERE expires_at < NOW()$$
);

-- Schedule cleanup of expired scan debounce (every 5 minutes)
SELECT cron.schedule(
    'cleanup-hardware-debounce',
    '*/5 * * * *',
    $$DELETE FROM hardware_scan_debounce WHERE expires_at < NOW()$$
);

-- Schedule cleanup of old revoked refresh tokens (daily at 3am)
SELECT cron.schedule(
    'cleanup-revoked-tokens',
    '0 3 * * *',
    $$DELETE FROM user_refresh_tokens WHERE revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days'$$
);

-- Schedule daily archive of old attendance logs (optional, weekly on Sunday 4am)
SELECT cron.schedule(
    'archive-old-attendance-logs',
    '0 4 * * 0',
    $$DELETE FROM attendance_logs WHERE scanned_at < NOW() - INTERVAL '1 year'$$
);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE students IS 'Registered students; student_code is the ID sent by hardware';
COMMENT ON TABLE attendance_logs IS 'Persisted attendance logs with spam protection';
COMMENT ON TABLE users IS 'Mobile app users (parents/teachers/admin)';
COMMENT ON TABLE user_refresh_tokens IS 'Hashed refresh tokens for JWT rotation and revocation';
COMMENT ON TABLE timetables IS 'Weekly timetable by class';
COMMENT ON TABLE attendance_spam_logs IS 'Spam protection for attendance sync (Redis replacement)';
COMMENT ON TABLE hardware_scan_debounce IS 'Hardware scan debounce (Redis replacement)';

-- ============================================================
-- END OF SCHEMA
-- ============================================================
