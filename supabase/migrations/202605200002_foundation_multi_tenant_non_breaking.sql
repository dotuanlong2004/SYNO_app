-- SYNO multi-tenant foundation, non-breaking phase
-- Created: 2026-05-20
--
-- This migration avoids revoking grants or replacing active policies.
-- It adds the long-term tenant foundation and fixes school-scoped attendance
-- lookup while minimizing the chance of breaking the current app.

begin;

create table if not exists public.schools (
  id varchar(64) primary key,
  name text not null,
  status varchar(32) not null default 'active'
    check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.schools (id, name)
values ('default_school', 'Default School')
on conflict (id) do nothing;

alter table public.schools enable row level security;

drop trigger if exists update_schools_updated_at on public.schools;
create trigger update_schools_updated_at
  before update on public.schools
  for each row
  execute function public.update_updated_at_column();

create schema if not exists app_private;
revoke all on schema app_private from public;

create or replace function app_private.is_staff_for_school(target_school_id varchar)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.is_active = true
      and up.school_id = target_school_id
      and up.role in ('admin', 'teacher')
  );
$$;

create or replace function app_private.is_admin_for_school(target_school_id varchar)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.is_active = true
      and up.school_id = target_school_id
      and up.role = 'admin'
  );
$$;

create or replace function app_private.is_parent_of_student(target_student_id bigint)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.students s
    where s.id = target_student_id
      and s.parent_id = auth.uid()
  );
$$;

create or replace function app_private.has_linked_child_in_class(
  target_school_id varchar,
  target_class_id varchar
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.students s
    where s.parent_id = auth.uid()
      and s.school_id = target_school_id
      and s.class_name = target_class_id
  );
$$;

revoke all on function app_private.is_staff_for_school(varchar) from public;
revoke all on function app_private.is_admin_for_school(varchar) from public;
revoke all on function app_private.is_parent_of_student(bigint) from public;
revoke all on function app_private.has_linked_child_in_class(varchar, varchar) from public;

-- Tenant-scoped indexes. Keep the existing global students.student_code unique
-- constraint for now to avoid surprising current code; the stricter SaaS
-- migration can drop it later.
create unique index if not exists students_school_id_student_code_key
  on public.students (school_id, student_code);

create unique index if not exists students_school_id_ma_cham_cong_key
  on public.students (school_id, ma_cham_cong)
  where ma_cham_cong is not null;

create index if not exists idx_attendance_logs_school_student_time
  on public.attendance_logs (school_id, student_id, scanned_at desc);

create index if not exists idx_timetables_school_class
  on public.timetables (school_id, class_id);

-- Add tenant FK constraints as NOT VALID first. These protect future writes
-- without forcing a table scan immediately. Validate in a maintenance window.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_profiles_school_id_fkey') then
    alter table public.user_profiles
      add constraint user_profiles_school_id_fkey
      foreign key (school_id) references public.schools(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'students_school_id_fkey') then
    alter table public.students
      add constraint students_school_id_fkey
      foreign key (school_id) references public.schools(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'attendance_logs_school_id_fkey') then
    alter table public.attendance_logs
      add constraint attendance_logs_school_id_fkey
      foreign key (school_id) references public.schools(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'timetables_school_id_fkey') then
    alter table public.timetables
      add constraint timetables_school_id_fkey
      foreign key (school_id) references public.schools(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'student_fees_school_id_fkey') then
    alter table public.student_fees
      add constraint student_fees_school_id_fkey
      foreign key (school_id) references public.schools(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'fee_notices_school_id_fkey') then
    alter table public.fee_notices
      add constraint fee_notices_school_id_fkey
      foreign key (school_id) references public.schools(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'grades_school_id_fkey') then
    alter table public.grades
      add constraint grades_school_id_fkey
      foreign key (school_id) references public.schools(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chat_messages_school_id_fkey') then
    alter table public.chat_messages
      add constraint chat_messages_school_id_fkey
      foreign key (school_id) references public.schools(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'announcements_school_id_fkey') then
    alter table public.announcements
      add constraint announcements_school_id_fkey
      foreign key (school_id) references public.schools(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'attendance_spam_logs_school_id_fkey') then
    alter table public.attendance_spam_logs
      add constraint attendance_spam_logs_school_id_fkey
      foreign key (school_id) references public.schools(id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'hardware_scan_debounce_school_id_fkey') then
    alter table public.hardware_scan_debounce
      add constraint hardware_scan_debounce_school_id_fkey
      foreign key (school_id) references public.schools(id) not valid;
  end if;
end $$;

create or replace function public.insert_attendance_from_device(
  p_ma_cham_cong varchar,
  p_scanned_at timestamptz,
  p_school_id varchar default 'default_school',
  p_log_type varchar default null,
  p_status_detail varchar default 'on_time'
)
returns table (
  inserted boolean,
  out_student_id bigint,
  student_name varchar,
  message text
)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_student_id bigint;
  v_student_name varchar;
  v_last_log_type varchar(32);
  v_determined_log_type varchar(32);
  v_log_type varchar(32);
begin
  select s.id, s.full_name
    into v_student_id, v_student_name
  from public.students s
  where s.school_id = p_school_id
    and s.ma_cham_cong = p_ma_cham_cong
  limit 1;

  if v_student_id is null then
    return query select
      false,
      null::bigint,
      null::varchar,
      ('Student not found for school=' || p_school_id || ', ma_cham_cong=' || p_ma_cham_cong)::text;
    return;
  end if;

  select al.log_type
    into v_last_log_type
  from public.attendance_logs al
  where al.school_id = p_school_id
    and al.student_id = v_student_id
    and date(al.scanned_at at time zone 'Asia/Ho_Chi_Minh')
      = date(p_scanned_at at time zone 'Asia/Ho_Chi_Minh')
  order by al.scanned_at desc
  limit 1;

  if v_last_log_type is null then
    v_determined_log_type := 'check_in';
  elsif v_last_log_type = 'check_in' then
    v_determined_log_type := 'check_out';
  else
    v_determined_log_type := 'check_in';
  end if;

  v_log_type := coalesce(p_log_type, v_determined_log_type);

  insert into public.attendance_logs (
    school_id,
    student_id,
    scanned_at,
    log_type,
    status_detail
  )
  values (
    p_school_id,
    v_student_id,
    p_scanned_at,
    v_log_type,
    coalesce(p_status_detail, case when v_log_type = 'check_in' then 'on_time' else 'leave' end)
  )
  on conflict do nothing;

  if found then
    return query select true, v_student_id, v_student_name, ('Inserted: ' || v_log_type)::text;
  else
    return query select false, v_student_id, v_student_name, 'Duplicate (already exists)'::text;
  end if;
end;
$$;

create or replace function public.record_attendance_with_spam_check(
  p_student_code varchar,
  p_school_id varchar default 'default_school',
  p_scanned_at timestamptz default now(),
  p_log_type varchar default null,
  p_status_detail varchar default null,
  p_late_minutes integer default null
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_student_id bigint;
  v_last_log_type varchar(32);
  v_next_log_type varchar(32);
  v_status_detail varchar(32);
  v_inserted_id bigint;
begin
  if exists (
    select 1
    from public.attendance_spam_logs asl
    where asl.school_id = p_school_id
      and asl.student_code = p_student_code
      and asl.expires_at > now()
  ) then
    return jsonb_build_object(
      'blocked', true,
      'student_id', null,
      'log_type', null,
      'error_message', 'Spam blocked (< 10 minutes).'
    );
  end if;

  select s.id
    into v_student_id
  from public.students s
  where s.school_id = p_school_id
    and s.student_code = p_student_code
  limit 1;

  if v_student_id is null then
    return jsonb_build_object(
      'blocked', false,
      'student_id', null,
      'log_type', null,
      'error_message', 'Student not found'
    );
  end if;

  select al.log_type
    into v_last_log_type
  from public.attendance_logs al
  where al.school_id = p_school_id
    and al.student_id = v_student_id
    and date(al.scanned_at at time zone 'Asia/Ho_Chi_Minh')
      = date(p_scanned_at at time zone 'Asia/Ho_Chi_Minh')
  order by al.scanned_at desc
  limit 1;

  v_next_log_type := coalesce(
    p_log_type,
    case when v_last_log_type = 'check_in' then 'check_out' else 'check_in' end
  );

  v_status_detail := coalesce(
    p_status_detail,
    case when v_next_log_type = 'check_in' then 'on_time' else 'leave' end
  );

  insert into public.attendance_logs (
    school_id,
    student_id,
    scanned_at,
    log_type,
    status_detail,
    late_minutes
  )
  values (
    p_school_id,
    v_student_id,
    p_scanned_at,
    v_next_log_type,
    v_status_detail,
    p_late_minutes
  )
  returning id into v_inserted_id;

  insert into public.attendance_spam_logs (school_id, student_code, expires_at)
  values (p_school_id, p_student_code, now() + interval '10 minutes')
  on conflict (school_id, student_code)
  do update set expires_at = excluded.expires_at;

  return jsonb_build_object(
    'blocked', false,
    'student_id', v_student_id,
    'attendance_log_id', v_inserted_id,
    'log_type', v_next_log_type,
    'error_message', null
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'blocked', true,
      'student_id', v_student_id,
      'log_type', v_next_log_type,
      'error_message', 'Duplicate attendance log'
    );
end;
$$;

commit;
