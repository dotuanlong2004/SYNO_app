# SUPABASE HARDENING PLAN - SYNO

Created: 2026-05-20

This is the long-term Supabase security and data-model direction for SYNO.

## Principle

SYNO is a SaaS platform for many schools. The database must assume:

- many schools share the same Supabase project;
- student codes and device enroll IDs can repeat between schools;
- parent/admin/teacher accounts must never see another school's data;
- frontend clients are not trusted for tenant selection;
- backend/server code owns privileged writes.

## Migration Files

Applied foundation migration:

```text
supabase/migrations/202605200002_foundation_multi_tenant_non_breaking.sql
```

Supabase recorded it as:

```text
20260520071341_foundation_multi_tenant_non_breaking
```

Applied strict grants/RLS migration:

```text
supabase/migrations/202605200003_strict_grants_rls_hardening.sql
```

Supabase recorded it as:

```text
20260520072813_strict_grants_rls_hardening
```

Applied tenant FK validation migration:

```text
supabase/migrations/202605200004_validate_school_id_foreign_keys.sql
```

Supabase recorded it as:

```text
20260520073202_validate_school_id_foreign_keys
```

Applied HNS tenant migration:

```text
supabase/migrations/202605200005_set_hns_school_tenant.sql
```

Applied legacy RPC default cleanup:

```text
supabase/migrations/202605200006_fix_legacy_attendance_function_defaults.sql
```

Applied legacy auth metadata cleanup:

```text
supabase/migrations/202605200007_update_legacy_auth_user_metadata_school_id.sql
```

Supabase recorded it as:

```text
20260520080824_update_legacy_auth_user_metadata_school_id
```

Production tenant:

```text
school_id: 1
name: Huu Nghi School
code: HNS
website_url: https://hns.edu.vn/
education_levels: primary, secondary, high_school
```

Older full proposal retained for reference:

```text
supabase/migration_proposals/202605200001_harden_multi_tenant_security.sql
```

Verification SQL:

```text
supabase/verification/verify_multi_tenant_security.sql
```

The foundation, strict grants/RLS, and FK validation migrations have been applied to production because Supabase Branching is not available on the current plan. The strict cutover was explicitly approved by the user with acceptance that some flows may need follow-up fixes if they depended on old broad grants.

## What The Foundation Migration Does

1. Adds `public.schools` as the tenant registry.
2. Adds private RLS helper functions in `app_private`.
3. Adds tenant foreign keys from business tables to `schools`.
4. Adds `(school_id, student_code)` uniqueness while keeping the old global constraint for now.
5. Adds `(school_id, ma_cham_cong)` uniqueness for hardware IDs.
6. Rewrites `insert_attendance_from_device` to lookup by both `school_id` and `ma_cham_cong`.
7. Adds the missing `record_attendance_with_spam_check` RPC used by backend.
8. Does not revoke grants or replace active policies yet.

## What The Strict Migration Does

1. Revoke broad `anon` and `authenticated` grants.
2. Replace permissive RLS policies with `school_id`-aware policies.
3. Harden `handle_new_user` so it no longer trusts `raw_user_meta_data` for role/school.
4. Keep frontend writes limited to intended authenticated flows.

The global `students.student_code` uniqueness was intentionally not dropped yet. Keep it until Admin Web, Parent App, imports, and reporting are verified against tenant-scoped uniqueness.

## Post-Cutover Regression Order

1. Run `verify_multi_tenant_security.sql`.
2. Test backend health.
3. Test Admin Web:
   - list students
   - create/update student
   - import students
   - timetable
   - fee notices
   - grades
4. Test Parent App:
   - login
   - linked child list
   - attendance history
   - timetable
   - fees
   - grades
5. Test AI-X1 backend route:
   - collector posts to `/api/v1/hardware/scan`
   - attendance log inserted
   - duplicate/debounce works
   - no direct Supabase anon read is required

Latest verification notes:

- `default_school_refs = 0` across active business tables.
- `auth.users.raw_user_meta_data ->> 'school_id' = 'default_school'` count is `0`.
- Admin Web build passes.
- Parent App analyze and tests pass.
- Backend health/Admin Web endpoints/login/RPC rollback smoke tests pass for tenant `1`.

## Follow-Up Code Work Required

The database migration is only one half. Completed code changes:

1. `backend/src/routes/hardware.js` resolves `ma_cham_cong` by `school_id` using the backend service role.
2. `hardware-collector/ronald-jack-aix1/Program.cs` no longer stores Supabase anon key or reads Supabase directly.
3. `backend/src/routes/auth.js` no longer sends role/school/student_code in user metadata during parent registration; it upserts the trusted profile server-side after link-code validation.
4. `supabase/functions/attendance-collector/index.ts` now accepts `school_id` and resolves students by `school_id + ma_cham_cong`.

Remaining code changes:

1. Move collector config out of code:
   - device IP/port
   - school ID
   - backend URL
   - hardware API key
2. Make Admin Web resolve `school_id` from authenticated admin profile, not `x-school-id`.
3. Decide canonical attendance ingestion path:
   - backend `/api/v1/hardware/scan`, or
   - Supabase Edge Function `attendance-collector`
4. If keeping Edge Function, add device auth.
5. Normalize fees:
   - choose `fee_notices` or `student_fees` as canonical;
   - migrate old data;
   - remove unused table after code no longer depends on it.

## Production Warning

Strict access is already active in production. If any frontend screen reads Supabase directly with assumptions from the old broad grants, that screen may now fail with grant/RLS errors and must be fixed to follow the intended role + `school_id` access model.
