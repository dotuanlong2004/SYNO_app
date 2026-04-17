-- 1. XÓA trigger lỗi
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- 2. XÓA user cũ nếu có (tránh conflict)
DELETE FROM user_profiles WHERE id IN (SELECT id FROM auth.users WHERE email IN ('admin@school.edu', 'parent@test.com'));
DELETE FROM auth.users WHERE email IN ('admin@school.edu', 'parent@test.com');

-- 3. TẠO user mới
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@school.edu', crypt('admin123', gen_salt('bf')), NOW(), NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'parent@test.com', crypt('parent123', gen_salt('bf')), NOW(), NOW(), NOW());

-- 4. TẠO profile
INSERT INTO user_profiles (id, full_name, role, school_id, email, student_code)
SELECT 
  id, 
  CASE WHEN email = 'admin@school.edu' THEN 'Admin School' ELSE 'Phu Huynh Test' END,
  CASE WHEN email = 'admin@school.edu' THEN 'admin' ELSE 'parent' END,
  'default_school',
  email,
  CASE WHEN email = 'parent@test.com' THEN 'TEST001' ELSE NULL END
FROM auth.users 
WHERE email IN ('admin@school.edu', 'parent@test.com');

-- 5. TẠO trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role, school_id, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent'),
    COALESCE(NEW.raw_user_meta_data->>'school_id', 'default_school'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 6. KIỂM TRA
SELECT 'Users created:' as status;
SELECT email, email_confirmed_at IS NOT NULL as confirmed FROM auth.users WHERE email IN ('admin@school.edu', 'parent@test.com');
