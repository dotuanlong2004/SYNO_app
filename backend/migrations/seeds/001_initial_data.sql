-- ============================================================
-- SEEDS: Initial Test Data
-- Run after all schema migrations
-- ============================================================

-- Test student
INSERT INTO public.students (student_code, full_name, class_name, link_code, school_id)
VALUES ('TEST001', 'Nguyễn Văn Test', '10A1', 'LINK123', 'default_school')
ON CONFLICT (student_code) DO NOTHING;

-- More sample students
INSERT INTO public.students (student_code, full_name, class_name, class_id, school_id)
VALUES 
    ('HS001', 'Trần Thị A', '10A1', '10A1', 'default_school'),
    ('HS002', 'Lê Văn B', '10A2', '10A2', 'default_school'),
    ('HS003', 'Phạm Thị C', '11A1', '11A1', 'default_school')
ON CONFLICT (student_code) DO NOTHING;

-- Sample timetable
INSERT INTO public.timetables (school_id, class_id, subject_name, day_of_week, start_time, end_time, room)
VALUES 
    ('default_school', '10A1', 'Toán', 1, '07:30', '08:15', '101'),
    ('default_school', '10A1', 'Lý', 1, '08:20', '09:05', '102'),
    ('default_school', '10A1', 'Hóa', 1, '09:10', '09:55', '103'),
    ('default_school', '10A1', 'Văn', 2, '07:30', '08:15', '201'),
    ('default_school', '10A1', 'Anh', 2, '08:20', '09:05', '202')
ON CONFLICT DO NOTHING;

-- Sample fees
INSERT INTO public.student_fees (school_id, student_id, total_amount, payment_status)
SELECT 
    'default_school',
    id,
    500000,
    'pending'
FROM public.students 
WHERE student_code IN ('TEST001', 'HS001', 'HS002')
ON CONFLICT DO NOTHING;
