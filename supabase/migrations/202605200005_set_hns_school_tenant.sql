-- Set the production tenant to Huu Nghi School (HNS).
-- school_id remains varchar for SaaS flexibility; the primary tenant id is "1".

alter table public.schools
  add column if not exists code varchar(64),
  add column if not exists website_url text,
  add column if not exists education_levels text[] not null default '{}'::text[];

insert into public.schools (id, name, status, code, website_url, education_levels)
values (
  '1',
  'Huu Nghi School',
  'active',
  'HNS',
  'https://hns.edu.vn/',
  array['primary', 'secondary', 'high_school']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  status = excluded.status,
  code = excluded.code,
  website_url = excluded.website_url,
  education_levels = excluded.education_levels,
  updated_at = now();

update public.user_profiles set school_id = '1' where school_id = 'default_school';
update public.students set school_id = '1' where school_id = 'default_school';
update public.attendance_logs set school_id = '1' where school_id = 'default_school';
update public.attendance_spam_logs set school_id = '1' where school_id = 'default_school';
update public.hardware_scan_debounce set school_id = '1' where school_id = 'default_school';
update public.timetables set school_id = '1' where school_id = 'default_school';
update public.grades set school_id = '1' where school_id = 'default_school';
update public.student_fees set school_id = '1' where school_id = 'default_school';
update public.fee_notices set school_id = '1' where school_id = 'default_school';
update public.chat_messages set school_id = '1' where school_id = 'default_school';
update public.announcements set school_id = '1' where school_id = 'default_school';

delete from public.schools where id = 'default_school';

alter table public.user_profiles alter column school_id set default '1';
alter table public.students alter column school_id set default '1';
alter table public.attendance_logs alter column school_id set default '1';
alter table public.timetables alter column school_id set default '1';
alter table public.grades alter column school_id set default '1';
alter table public.student_fees alter column school_id set default '1';
alter table public.fee_notices alter column school_id set default '1';
alter table public.chat_messages alter column school_id set default '1';
alter table public.announcements alter column school_id set default '1';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.user_profiles (id, full_name, role, school_id, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'parent',
    '1',
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.insert_attendance_from_device(
  p_ma_cham_cong text,
  p_scanned_at timestamptz default now(),
  p_log_type varchar default 'check_in',
  p_school_id varchar default '1',
  p_device_id text default null
)
returns table(
  inserted boolean,
  attendance_id bigint,
  student_id bigint,
  student_code varchar,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student record;
  v_attendance_id bigint;
begin
  select s.id, s.student_code, s.school_id
    into v_student
  from public.students s
  where s.school_id = p_school_id
    and s.ma_cham_cong = p_ma_cham_cong
  limit 1;

  if v_student.id is null then
    return query select
      false,
      null::bigint,
      null::bigint,
      null::varchar,
      ('Student not found for school=' || p_school_id || ', ma_cham_cong=' || p_ma_cham_cong)::text;
    return;
  end if;

  select al.id
    into v_attendance_id
  from public.attendance_logs al
  where al.school_id = p_school_id
    and al.student_id = v_student.id
    and al.scanned_at = p_scanned_at
    and al.log_type = p_log_type
  limit 1;

  if v_attendance_id is not null then
    return query select
      false,
      v_attendance_id,
      v_student.id,
      v_student.student_code,
      'Duplicate attendance log ignored'::text;
    return;
  end if;

  insert into public.attendance_logs (
    school_id,
    student_id,
    scanned_at,
    log_type,
    status_detail,
    created_by
  )
  values (
    p_school_id,
    v_student.id,
    p_scanned_at,
    p_log_type,
    'on_time',
    null
  )
  returning id into v_attendance_id;

  return query select
    true,
    v_attendance_id,
    v_student.id,
    v_student.student_code,
    'Attendance log inserted'::text;
end;
$$;

create or replace function public.record_attendance_with_spam_check(
  p_student_code varchar,
  p_scanned_at timestamptz default now(),
  p_log_type varchar default 'check_in',
  p_school_id varchar default '1',
  p_device_id text default null
)
returns table(
  inserted boolean,
  attendance_id bigint,
  student_id bigint,
  student_code varchar,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student record;
  v_attendance_id bigint;
  v_recent_spam timestamptz;
begin
  select asl.expires_at
    into v_recent_spam
  from public.attendance_spam_logs asl
  where asl.school_id = p_school_id
    and asl.student_code = p_student_code
    and asl.expires_at > now()
  order by asl.expires_at desc
  limit 1;

  if v_recent_spam is not null then
    return query select
      false,
      null::bigint,
      null::bigint,
      p_student_code,
      'Attendance ignored by spam window'::text;
    return;
  end if;

  select s.id, s.student_code, s.school_id
    into v_student
  from public.students s
  where s.school_id = p_school_id
    and s.student_code = p_student_code
  limit 1;

  if v_student.id is null then
    return query select
      false,
      null::bigint,
      null::bigint,
      p_student_code,
      ('Student not found for school=' || p_school_id || ', student_code=' || p_student_code)::text;
    return;
  end if;

  select al.id
    into v_attendance_id
  from public.attendance_logs al
  where al.school_id = p_school_id
    and al.student_id = v_student.id
    and al.scanned_at = p_scanned_at
    and al.log_type = p_log_type
  limit 1;

  if v_attendance_id is not null then
    return query select
      false,
      v_attendance_id,
      v_student.id,
      v_student.student_code,
      'Duplicate attendance log ignored'::text;
    return;
  end if;

  insert into public.attendance_logs (
    school_id,
    student_id,
    scanned_at,
    log_type,
    status_detail,
    created_by
  )
  values (
    p_school_id,
    v_student.id,
    p_scanned_at,
    p_log_type,
    'on_time',
    null
  )
  returning id into v_attendance_id;

  insert into public.attendance_spam_logs (school_id, student_code, expires_at)
  values (p_school_id, p_student_code, now() + interval '10 minutes')
  on conflict (school_id, student_code)
  do update set expires_at = excluded.expires_at, created_at = now();

  return query select
    true,
    v_attendance_id,
    v_student.id,
    v_student.student_code,
    'Attendance log inserted'::text;
end;
$$;
