-- Platform audit trail for SYNO Super Admin operations.
-- Backend writes through the service role; authenticated reads remain RLS-scoped
-- to active super_admin accounts for defense in depth.

begin;

create table if not exists public.platform_audit_logs (
  id bigserial primary key,
  actor_user_id uuid null references auth.users(id) on delete set null,
  actor_email text null,
  action text not null,
  target_type text not null,
  target_id text not null,
  school_id varchar(64) null references public.schools(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_audit_logs_created_at
  on public.platform_audit_logs (created_at desc);

create index if not exists idx_platform_audit_logs_school_created_at
  on public.platform_audit_logs (school_id, created_at desc);

create index if not exists idx_platform_audit_logs_target
  on public.platform_audit_logs (target_type, target_id);

alter table public.platform_audit_logs enable row level security;

grant select on public.platform_audit_logs to authenticated;
grant select, insert on public.platform_audit_logs to service_role;
grant usage, select on sequence public.platform_audit_logs_id_seq to service_role;

create or replace function app_private.is_super_admin()
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
      and up.role = 'super_admin'
  );
$$;

revoke all on function app_private.is_super_admin() from public;

drop policy if exists "super admins can read platform audit logs" on public.platform_audit_logs;
create policy "super admins can read platform audit logs"
  on public.platform_audit_logs
  for select
  to authenticated
  using (app_private.is_super_admin());

commit;
