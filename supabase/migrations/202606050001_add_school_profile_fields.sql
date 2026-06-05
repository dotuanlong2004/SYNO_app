alter table public.schools
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists description text;

update public.schools
set
  name = 'Trường Hữu Nghị Quốc Tế',
  code = 'HNS',
  website_url = 'https://hns.edu.vn/',
  education_levels = array['preschool', 'primary', 'secondary', 'high_school']::text[],
  address = '50 đường Quán Nam, Phường Kênh Dương, Quận Lê Chân, Hải Phòng',
  phone = '0225 360 6999',
  email = 'tuyensinh@hns.edu.vn',
  description = 'Trường Hữu Nghị Quốc Tế là đơn vị giáo dục tại Hải Phòng. SYNO là dịch vụ kết nối dữ liệu giữa nhà trường và phụ huynh, hỗ trợ theo dõi điểm danh, lịch học, học phí, thông báo và hoạt động của trường.',
  updated_at = now()
where id = '1';
