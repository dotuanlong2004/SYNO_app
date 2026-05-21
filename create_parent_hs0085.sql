-- ============================================
-- TẠO TÀI KHOẢN PHỤ HUYNH CHO HS0085 (Long)
-- ============================================

-- Bước 1: Tạo user trong auth.users (sử dụng Supabase Auth API hoặc Dashboard)
-- Email: <parent-email>
-- Password: <set-secure-password-outside-git>
-- Sau đó lấy UUID để insert vào user_profiles

-- Bước 2: Insert vào user_profiles
-- Lưu ý: Cần user_id từ auth.users trước

INSERT INTO user_profiles (
    id,  -- UUID từ auth.users
    full_name,
    role,
    student_code,
    school_id,
    is_active,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',  -- Thay bằng UUID thực tế từ auth.users
    N'Phụ huynh - Long',
    'parent',
    'HS0085',
    '1',
    true,
    NOW(),
    NOW()
);

-- ============================================
-- HOẶC: Dùng cách đơn giản hơn qua Supabase Dashboard
-- ============================================

/*
Hướng dẫn tạo nhanh qua Supabase Dashboard:

1. Vào https://supabase.com/dashboard
2. Chọn project: bimepdqcwpsynjimvenn
3. Vào Authentication → Users
4. Click "Add user"
5. Email: <parent-email>
6. Password: <set-secure-password-outside-git>
7. Click "Create user"
8. Copy UUID của user mới

9. Vào Table Editor → user_profiles
10. Insert row:
    - id: <UUID vừa copy>
    - full_name: Phụ huynh - Long
    - role: parent
    - student_code: HS0085
    - school_id: 1
    - is_active: true

11. Done!
*/

-- ============================================
-- KIỂM TRA DỮ LIỆU
-- ============================================

-- Kiểm tra student HS0085
SELECT * FROM students WHERE student_code = 'HS0085';

-- Kiểm tra parent account
SELECT * FROM user_profiles WHERE student_code = 'HS0085' AND role = 'parent';

-- Kiểm tra attendance logs
SELECT * FROM attendance_logs 
WHERE student_id = (SELECT id FROM students WHERE student_code = 'HS0085')
ORDER BY scanned_at DESC 
LIMIT 10;
