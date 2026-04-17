ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) NOT NULL DEFAULT 'default_school';
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) NOT NULL DEFAULT 'default_school';
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) NOT NULL DEFAULT 'default_school';
ALTER TABLE timetables ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) NOT NULL DEFAULT 'default_school';
ALTER TABLE user_refresh_tokens ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) NOT NULL DEFAULT 'default_school';

CREATE INDEX IF NOT EXISTS idx_users_school_id ON users (school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students (school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_school_id ON attendance_logs (school_id);
CREATE INDEX IF NOT EXISTS idx_timetables_school_id ON timetables (school_id);
CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_school_id ON user_refresh_tokens (school_id);

CREATE INDEX IF NOT EXISTS idx_timetables_school_class_day_start
ON timetables (school_id, class_id, day_of_week, start_time);
