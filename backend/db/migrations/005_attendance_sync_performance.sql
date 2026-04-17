CREATE INDEX IF NOT EXISTS idx_attendance_logs_student_check_time
ON attendance_logs (student_id, scanned_at DESC);
