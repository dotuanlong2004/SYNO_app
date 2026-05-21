-- SYNO multi-tenant security hardening proposal
-- Created: 2026-05-20
--
-- IMPORTANT:
-- This migration is intentionally written as a reviewable proposal.
-- Apply on a development branch/database first, then verify admin, parent,
-- hardware collector, and mobile flows before production.
--
-- Goals:
-- 1. Make tenant/school boundaries explicit.
-- 2. Remove broad anon/authenticated access.
-- 3. Replace permissive RLS policies with school-scoped policies.
-- 4. Prepare schema for many schools using the same platform.

begin;

-- ---------------------------------------------------------------------------
-- 1. Tenant registry
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 2. Private helper schema for RLS.
-- Keep privileged helpers out of the exposed public schema.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 3. Tenant-scoped foreign keys and uniqueness.
-- Use NOT VALID to avoid long locks; validate after staging checks if needed.
-- ---------------------------------------------------------------------------

alter table public.user_profiles
  add constraint user_profiles_school_id_fkey
  foreign key (school_id) references public.schools(id)
  not valid;

alter table public.students
  add constraint students_school_id_fkey
  foreign key (school_id) references public.schools(id)
  not valid;

alter table public.attendance_logs
  add constraint attendance_logs_school_id_fkey
  foreign key (school_id) references public.schools(id)
  not valid;

alter table public.timetables
  add constraint timetables_school_id_fkey
  foreign key (school_id) references public.schools(id)
  not valid;

alter table public.student_fees
  add constraint student_fees_school_id_fkey
  foreign key (school_id) references public.schools(id)
  not valid;

alter table public.fee_notices
  add constraint fee_notices_school_id_fkey
  foreign key (school_id) references public.schools(id)
  not valid;

alter table public.grades
  add constraint grades_school_id_fkey
  foreign key (school_id) references public.schools(id)
  not valid;

alter table public.chat_messages
  add constraint chat_messages_school_id_fkey
  foreign key (school_id) references public.schools(id)
  not valid;

alter table public.announcements
  add constraint announcements_school_id_fkey
  foreign key (school_id) references public.schools(id)
  not valid;

alter table public.attendance_spam_logs
  add constraint attendance_spam_logs_school_id_fkey
  foreign key (school_id) references public.schools(id)
  not valid;

alter table public.hardware_scan_debounce
  add constraint hardware_scan_debounce_school_id_fkey
  foreign key (school_id) references public.schools(id)
  not valid;

-- SaaS-safe student code uniqueness.
alter table public.students
  drop constraint if exists students_student_code_key;

create unique index if not exists students_school_id_student_code_key
  on public.students (school_id, student_code);

create unique index if not exists students_school_id_ma_cham_cong_key
  on public.students (school_id, ma_cham_cong)
  where ma_cham_cong is not null;

-- ---------------------------------------------------------------------------
-- 4. Fix attendance device function to be school-scoped.
-- Keep public name temporarily for compatibility, but do not use anon access.
-- ---------------------------------------------------------------------------

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

-- Backend currently calls this RPC first. Install it so the fallback path is no
-- longer the normal path.
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

-- ---------------------------------------------------------------------------
-- 5. Grants: remove broad public access.
-- service_role keeps backend/server access. Authenticated direct access is read
-- or narrow write only where RLS policies below allow it.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from anon;
revoke all on all sequences in schema public from authenticated;

grant usage on schema public to anon, authenticated;

grant select on public.schools to authenticated;
grant select on public.user_profiles to authenticated;
grant update (full_name, fcm_token, updated_at) on public.user_profiles to authenticated;

grant select on public.students to authenticated;
grant select on public.attendance_logs to authenticated;
grant select on public.timetables to authenticated;
grant select on public.grades to authenticated;
grant select on public.grade_records to authenticated;
grant select on public.student_fees to authenticated;
grant select on public.fee_notices to authenticated;
grant select on public.chat_messages to authenticated;
grant insert on public.chat_messages to authenticated;
grant select on public.announcements to authenticated;

-- Staff/admin direct Data API paths if the client uses Supabase directly.
grant insert, update, delete on public.students to authenticated;
grant insert, update, delete on public.timetables to authenticated;
grant insert, update, delete on public.grades to authenticated;
grant insert, update, delete on public.student_fees to authenticated;
grant insert, update, delete on public.fee_notices to authenticated;
grant insert, update, delete on public.announcements to authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- Hardware/device should not use anon Supabase access. It should call backend
-- or an authenticated Edge Function.

-- ---------------------------------------------------------------------------
-- 6. Replace permissive RLS policies.
-- ---------------------------------------------------------------------------

drop policy if exists "Anyone can view announcements" on public.announcements;
drop policy if exists "zk_agent_insert_attendance" on public.attendance_logs;
drop policy if exists "Anyone can view chat" on public.chat_messages;
drop policy if exists "Anyone can view fee notices" on public.fee_notices;
drop policy if exists "Parent reads own child grades" on public.grades;
drop policy if exists "Parent reads own child fees" on public.student_fees;
drop policy if exists "Parents can view linked students" on public.students;
drop policy if exists "zk_agent_read_students" on public.students;
drop policy if exists "timetables_admin_policy" on public.timetables;
drop policy if exists "Admins view all" on public.user_profiles;
drop policy if exists "Users update own profile" on public.user_profiles;
drop policy if exists "Users view own profile" on public.user_profiles;

-- schools
drop policy if exists "school members can read active schools" on public.schools;
create policy "school members can read active schools"
  on public.schools
  for select to authenticated
  using (
    status = 'active'
    and exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.school_id = schools.id
        and up.is_active = true
    )
  );

-- user_profiles
create policy "users read own profile"
  on public.user_profiles
  for select to authenticated
  using (id = auth.uid());

create policy "admins read profiles in own school"
  on public.user_profiles
  for select to authenticated
  using (app_private.is_admin_for_school(school_id));

create policy "users update limited own profile"
  on public.user_profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- students
create policy "parents read linked students"
  on public.students
  for select to authenticated
  using (parent_id = auth.uid());

create policy "staff read students in own school"
  on public.students
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

create policy "admins manage students in own school"
  on public.students
  for all to authenticated
  using (app_private.is_admin_for_school(school_id))
  with check (app_private.is_admin_for_school(school_id));

-- attendance
create policy "staff read attendance in own school"
  on public.attendance_logs
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

create policy "parents read linked child attendance"
  on public.attendance_logs
  for select to authenticated
  using (app_private.is_parent_of_student(student_id));

-- spam/debounce tables are server-only.
-- No authenticated/anon policies are intentionally created.

-- timetables
create policy "staff read timetables in own school"
  on public.timetables
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

create policy "parents read linked class timetable"
  on public.timetables
  for select to authenticated
  using (app_private.has_linked_child_in_class(school_id, class_id));

create policy "staff manage timetables in own school"
  on public.timetables
  for all to authenticated
  using (app_private.is_staff_for_school(school_id))
  with check (app_private.is_staff_for_school(school_id));

-- grades
create policy "staff read grades in own school"
  on public.grades
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

create policy "parents read linked child grades"
  on public.grades
  for select to authenticated
  using (app_private.is_parent_of_student(student_id));

create policy "staff manage grades in own school"
  on public.grades
  for all to authenticated
  using (app_private.is_staff_for_school(school_id))
  with check (app_private.is_staff_for_school(school_id));

-- fees
create policy "staff read student fees in own school"
  on public.student_fees
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

create policy "parents read linked child student fees"
  on public.student_fees
  for select to authenticated
  using (app_private.is_parent_of_student(student_id));

create policy "staff manage student fees in own school"
  on public.student_fees
  for all to authenticated
  using (app_private.is_staff_for_school(school_id))
  with check (app_private.is_staff_for_school(school_id));

create policy "staff read fee notices in own school"
  on public.fee_notices
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

create policy "parents read linked child fee notices"
  on public.fee_notices
  for select to authenticated
  using (student_id is not null and app_private.is_parent_of_student(student_id));

create policy "staff manage fee notices in own school"
  on public.fee_notices
  for all to authenticated
  using (app_private.is_staff_for_school(school_id))
  with check (app_private.is_staff_for_school(school_id));

-- chat
create policy "staff read chat in own school"
  on public.chat_messages
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

create policy "parents read linked child chat"
  on public.chat_messages
  for select to authenticated
  using (student_id is not null and app_private.is_parent_of_student(student_id));

create policy "members insert scoped chat"
  on public.chat_messages
  for insert to authenticated
  with check (
    app_private.is_staff_for_school(school_id)
    or (student_id is not null and app_private.is_parent_of_student(student_id))
  );

-- announcements
create policy "staff read announcements in own school"
  on public.announcements
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

create policy "parents read relevant announcements"
  on public.announcements
  for select to authenticated
  using (
    (
      is_general = true
      and exists (
        select 1 from public.students s
        where s.parent_id = auth.uid()
          and s.school_id = announcements.school_id
      )
    )
    or (student_id is not null and app_private.is_parent_of_student(student_id))
    or (class_id is not null and app_private.has_linked_child_in_class(school_id, class_id))
  );

create policy "staff manage announcements in own school"
  on public.announcements
  for all to authenticated
  using (app_private.is_staff_for_school(school_id))
  with check (app_private.is_staff_for_school(school_id));

-- ---------------------------------------------------------------------------
-- 7. Harden auth trigger function.
-- Parent/admin role assignment should be handled server-side. New auth users
-- start as inactive parent in default_school until backend validates linkage.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.user_profiles (id, full_name, role, school_id, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    'parent',
    'default_school',
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Keep existing RLS auto-enable function, but do not grant it to public roles.
revoke all on function public.rls_auto_enable() from public;

commit;
