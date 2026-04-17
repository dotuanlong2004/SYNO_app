-- Seed 10 attendance records
-- Run this in Supabase SQL Editor

INSERT INTO attendance_logs (school_id, student_id, scanned_at, log_type, status_detail, late_minutes, created_by) VALUES
('default_school', 1, NOW() - INTERVAL '2 hours', 'check_in', 'on_time', NULL, NULL),
('default_school', 1, NOW() - INTERVAL '30 minutes', 'check_out', 'on_time', NULL, NULL),
('default_school', 1, NOW() - INTERVAL '1 day 2 hours', 'check_in', 'late', 15, NULL),
('default_school', 1, NOW() - INTERVAL '1 day 30 minutes', 'check_out', 'on_time', NULL, NULL),
('default_school', 1, NOW() - INTERVAL '2 days 2 hours', 'check_in', 'on_time', NULL, NULL),
('default_school', 1, NOW() - INTERVAL '2 days 30 minutes', 'check_out', 'leave', NULL, NULL),
('default_school', 1, NOW() - INTERVAL '3 days 2 hours', 'check_in', 'late', 25, NULL),
('default_school', 1, NOW() - INTERVAL '3 days 30 minutes', 'check_out', 'on_time', NULL, NULL),
('default_school', 1, NOW() - INTERVAL '4 days 2 hours', 'check_in', 'on_time', NULL, NULL),
('default_school', 1, NOW() - INTERVAL '4 days 30 minutes', 'check_out', 'on_time', NULL, NULL);

SELECT '✅ Inserted 10 attendance records' as status;
