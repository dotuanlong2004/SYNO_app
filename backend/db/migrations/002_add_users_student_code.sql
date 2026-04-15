ALTER TABLE users ADD COLUMN IF NOT EXISTS student_code VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_users_student_code ON users (student_code);
