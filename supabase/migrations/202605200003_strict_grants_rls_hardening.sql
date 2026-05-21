-- SYNO strict grants/RLS hardening
-- Created: 2026-05-20
--
-- Prerequisite:
-- 202605200002_foundation_multi_tenant_non_breaking.sql has been applied.
--
-- This migration removes broad public access and replaces permissive RLS
-- policies with role + school scoped policies.

begin;

-- Allow policy helper functions to be evaluated by authenticated users.
grant usage on schema app_private to authenticated;
grant execute on function app_private.is_staff_for_school(varchar) to authenticated;
grant execute on function app_private.is_admin_for_school(varchar) to authenticated;
grant execute on function app_private.is_parent_of_student(bigint) to authenticated;
grant execute on function app_private.has_linked_child_in_class(varchar, varchar) to authenticated;

-- service_role/backend keeps full access via Supabase service-role bypass.
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

-- Staff/admin direct Data API paths. Backend service role remains preferred.
grant insert, update, delete on public.students to authenticated;
grant insert, update, delete on public.timetables to authenticated;
grant insert, update, delete on public.grades to authenticated;
grant insert, update, delete on public.student_fees to authenticated;
grant insert, update, delete on public.fee_notices to authenticated;
grant insert, update, delete on public.announcements to authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- Old permissive policies.
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

-- Idempotent replacement policies.
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

drop policy if exists "users read own profile" on public.user_profiles;
create policy "users read own profile"
  on public.user_profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists "admins read profiles in own school" on public.user_profiles;
create policy "admins read profiles in own school"
  on public.user_profiles
  for select to authenticated
  using (app_private.is_admin_for_school(school_id));

drop policy if exists "users update limited own profile" on public.user_profiles;
create policy "users update limited own profile"
  on public.user_profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "parents read linked students" on public.students;
create policy "parents read linked students"
  on public.students
  for select to authenticated
  using (parent_id = auth.uid());

drop policy if exists "staff read students in own school" on public.students;
create policy "staff read students in own school"
  on public.students
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

drop policy if exists "admins manage students in own school" on public.students;
create policy "admins manage students in own school"
  on public.students
  for all to authenticated
  using (app_private.is_admin_for_school(school_id))
  with check (app_private.is_admin_for_school(school_id));

drop policy if exists "staff read attendance in own school" on public.attendance_logs;
create policy "staff read attendance in own school"
  on public.attendance_logs
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

drop policy if exists "parents read linked child attendance" on public.attendance_logs;
create policy "parents read linked child attendance"
  on public.attendance_logs
  for select to authenticated
  using (app_private.is_parent_of_student(student_id));

-- attendance_spam_logs and hardware_scan_debounce remain server-only through
-- service_role. No authenticated/anon policies are intentionally created.

drop policy if exists "staff read timetables in own school" on public.timetables;
create policy "staff read timetables in own school"
  on public.timetables
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

drop policy if exists "parents read linked class timetable" on public.timetables;
create policy "parents read linked class timetable"
  on public.timetables
  for select to authenticated
  using (app_private.has_linked_child_in_class(school_id, class_id));

drop policy if exists "staff manage timetables in own school" on public.timetables;
create policy "staff manage timetables in own school"
  on public.timetables
  for all to authenticated
  using (app_private.is_staff_for_school(school_id))
  with check (app_private.is_staff_for_school(school_id));

drop policy if exists "staff read grades in own school" on public.grades;
create policy "staff read grades in own school"
  on public.grades
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

drop policy if exists "parents read linked child grades" on public.grades;
create policy "parents read linked child grades"
  on public.grades
  for select to authenticated
  using (app_private.is_parent_of_student(student_id));

drop policy if exists "staff manage grades in own school" on public.grades;
create policy "staff manage grades in own school"
  on public.grades
  for all to authenticated
  using (app_private.is_staff_for_school(school_id))
  with check (app_private.is_staff_for_school(school_id));

drop policy if exists "staff read student fees in own school" on public.student_fees;
create policy "staff read student fees in own school"
  on public.student_fees
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

drop policy if exists "parents read linked child student fees" on public.student_fees;
create policy "parents read linked child student fees"
  on public.student_fees
  for select to authenticated
  using (app_private.is_parent_of_student(student_id));

drop policy if exists "staff manage student fees in own school" on public.student_fees;
create policy "staff manage student fees in own school"
  on public.student_fees
  for all to authenticated
  using (app_private.is_staff_for_school(school_id))
  with check (app_private.is_staff_for_school(school_id));

drop policy if exists "staff read fee notices in own school" on public.fee_notices;
create policy "staff read fee notices in own school"
  on public.fee_notices
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

drop policy if exists "parents read linked child fee notices" on public.fee_notices;
create policy "parents read linked child fee notices"
  on public.fee_notices
  for select to authenticated
  using (student_id is not null and app_private.is_parent_of_student(student_id));

drop policy if exists "staff manage fee notices in own school" on public.fee_notices;
create policy "staff manage fee notices in own school"
  on public.fee_notices
  for all to authenticated
  using (app_private.is_staff_for_school(school_id))
  with check (app_private.is_staff_for_school(school_id));

drop policy if exists "staff read chat in own school" on public.chat_messages;
create policy "staff read chat in own school"
  on public.chat_messages
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

drop policy if exists "parents read linked child chat" on public.chat_messages;
create policy "parents read linked child chat"
  on public.chat_messages
  for select to authenticated
  using (student_id is not null and app_private.is_parent_of_student(student_id));

drop policy if exists "members insert scoped chat" on public.chat_messages;
create policy "members insert scoped chat"
  on public.chat_messages
  for insert to authenticated
  with check (
    app_private.is_staff_for_school(school_id)
    or (student_id is not null and app_private.is_parent_of_student(student_id))
  );

drop policy if exists "staff read announcements in own school" on public.announcements;
create policy "staff read announcements in own school"
  on public.announcements
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

drop policy if exists "parents read relevant announcements" on public.announcements;
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

drop policy if exists "staff manage announcements in own school" on public.announcements;
create policy "staff manage announcements in own school"
  on public.announcements
  for all to authenticated
  using (app_private.is_staff_for_school(school_id))
  with check (app_private.is_staff_for_school(school_id));

-- Parent/admin role assignment is server-owned. New auth users start as a
-- basic parent profile; backend register-parent validates link code and upserts
-- exact school/class/student values after signup.
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

revoke all on function public.rls_auto_enable() from public;

commit;
