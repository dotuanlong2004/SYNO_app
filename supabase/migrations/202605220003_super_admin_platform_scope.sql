-- Model platform operators separately from school tenant accounts.
-- super_admin users are platform-scoped and may have user_profiles.school_id = null.
-- Tenant roles still require a real school_id protected by the existing FK.

begin;

alter table public.user_profiles
  alter column school_id drop not null;

alter table public.user_profiles
  drop constraint if exists user_profiles_tenant_roles_require_school;

alter table public.user_profiles
  add constraint user_profiles_tenant_roles_require_school
  check (
    role = 'super_admin'
    or school_id is not null
  );

update public.user_profiles
set school_id = null,
    updated_at = now()
where role = 'super_admin';

update auth.users
set raw_user_meta_data = jsonb_set(
      coalesce(raw_user_meta_data, '{}'::jsonb),
      '{school_id}',
      'null'::jsonb,
      true
    ),
    raw_app_meta_data = jsonb_set(
      coalesce(raw_app_meta_data, '{}'::jsonb),
      '{school_id}',
      'null'::jsonb,
      true
    )
where id in (
  select id
  from public.user_profiles
  where role = 'super_admin'
);

commit;
