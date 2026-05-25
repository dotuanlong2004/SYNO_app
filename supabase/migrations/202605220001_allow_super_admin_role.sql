-- Allow platform-level SYNO operators while preserving school-scoped roles.
-- This does not grant table access by itself; backend/admin routes still enforce role checks.

begin;

alter table public.user_profiles
  drop constraint if exists user_profiles_role_check;

alter table public.user_profiles
  add constraint user_profiles_role_check
  check (role in ('parent', 'teacher', 'admin', 'super_admin'));

commit;
