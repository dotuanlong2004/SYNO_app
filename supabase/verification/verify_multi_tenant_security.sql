-- SYNO multi-tenant security verification
-- Run after applying:
-- - 202605200002_foundation_multi_tenant_non_breaking.sql
-- - 202605200003_strict_grants_rls_hardening.sql
-- - 202605200004_validate_school_id_foreign_keys.sql
-- Review every result before accepting a Supabase cutover.

-- 1. No anon table privileges should remain on business data.
select table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
order by table_name, privilege_type;

-- 2. Authenticated grants should be intentionally narrow.
select table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
order by table_name, privilege_type;

-- 3. All exposed business tables should have RLS enabled.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- 4. Policies should be school-scoped; manually inspect for USING true.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 5. Views should use security_invoker where exposed.
select
  n.nspname as schema,
  c.relname as view_name,
  c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('v', 'm')
order by c.relname;

-- 6. Tenant uniqueness should be scoped by school_id.
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'students'
order by indexname;

-- 7. Required functions should exist.
select
  n.nspname as schema,
  p.proname as function_name,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where (n.nspname = 'public' and p.proname in (
  'record_attendance_with_spam_check',
  'insert_attendance_from_device',
  'handle_new_user',
  'rls_auto_enable'
))
or (n.nspname = 'app_private')
order by schema, function_name;

-- 8. Data should still be connected.
select 'students_missing_parent' as check_name, count(*)::bigint as count
from public.students
where parent_id is null
union all
select 'students_with_ma_cham_cong', count(*)
from public.students
where ma_cham_cong is not null
union all
select 'attendance_without_student', count(*)
from public.attendance_logs al
left join public.students s on s.id = al.student_id
where s.id is null
union all
select 'fee_notices_without_student', count(*)
from public.fee_notices fn
left join public.students s on s.id = fn.student_id
where fn.student_id is not null and s.id is null;

-- 9. Tenant school_id foreign keys should be validated.
select conrelid::regclass::text as table_name, conname, convalidated
from pg_constraint
where connamespace = 'public'::regnamespace
  and conname like '%school%fkey'
order by table_name, conname;

-- 10. Production tenant should be HNS school_id "1"; no data should remain on default_school.
select id, name, code, website_url, education_levels, status
from public.schools
order by id;

select count(*)::int as default_school_refs
from (
  select school_id from public.announcements
  union all select school_id from public.attendance_logs
  union all select school_id from public.attendance_spam_logs
  union all select school_id from public.chat_messages
  union all select school_id from public.fee_notices
  union all select school_id from public.grades
  union all select school_id from public.hardware_scan_debounce
  union all select school_id from public.student_fees
  union all select school_id from public.students
  union all select school_id from public.timetables
  union all select school_id from public.user_profiles
) x
where school_id = 'default_school';

-- 11. Attendance RPC overloads should default to school_id "1".
select n.nspname as schema, p.proname as function_name, pg_get_function_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('insert_attendance_from_device', 'record_attendance_with_spam_check')
order by p.proname, p.oid::regprocedure::text;

-- 12. Legacy auth metadata should not point at the removed default_school tenant.
select count(*)::int as stale_auth_metadata_count
from auth.users
where raw_user_meta_data ->> 'school_id' = 'default_school';
