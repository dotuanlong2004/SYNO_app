# SUPABASE AUDIT - SYNO

Audit date: 2026-05-20
Project: `SYNO APP`
Project ref: `bimepdqcwpsynjimvenn`
Region: `ap-southeast-1`
Database: Postgres 17
Status: `ACTIVE_HEALTHY`

This audit started as read-only. After review and explicit production approval, the following hardening migrations were applied:

```text
20260520071341 foundation_multi_tenant_non_breaking
20260520072813 strict_grants_rls_hardening
20260520073202 validate_school_id_foreign_keys
```

The critical grant/RLS findings below describe the pre-hardening state. The current production state now has strict grants/RLS active and validated tenant foreign keys.

Follow-up code hardening completed after the audit:

- Backend hardware route resolves `ma_cham_cong` server-side by `school_id`.
- AI-X1 collector no longer reads Supabase directly with anon key.
- Parent registration no longer sends role/school/student_code through user metadata.
- Edge Function student lookup is now school-scoped.

## Sources Checked

- Supabase project metadata through MCP.
- Public schema tables, columns, constraints, indexes, views, functions, triggers, policies, and grants.
- Edge Function list.
- Local backend, Web Admin, Flutter app, Supabase function, and AI-X1 collector code.
- Supabase changelog as of 2026-05-20.

Relevant Supabase changelog items:

- New public schema tables are no longer safely assumed to be exposed to the Data API without explicit grants.
- Postgres 14 deprecation is not relevant to this project because SYNO is already on Postgres 17.
- Node.js 20 support removal is upcoming for Supabase JS packages after 2026-06-30, so backend runtime should be Node 22+ before later dependency upgrades.

## Current Database Snapshot

Main public tables/views:

- `user_profiles` - 5 rows
- `students` - 2 rows
- `attendance_logs` - 45 rows
- `timetables` - 215 rows
- `student_fees` - 1 row
- `grades` - 0 rows
- `fee_notices` - 0 rows
- `chat_messages` - 0 rows
- `attendance_spam_logs` - 2 rows
- `hardware_scan_debounce` - 3 rows
- `announcements` - 0 rows
- `grade_records` - view, `security_invoker=on`

Current data is still single-tenant:

- `students`: 1 distinct `school_id`
- `user_profiles`: 1 distinct `school_id`
- `attendance_logs`: 1 distinct `school_id`
- `timetables`: 1 distinct `school_id`

Data health checks:

- 2 students total.
- 1 student linked to parent.
- 1 student has `ma_cham_cong`.
- 45 attendance logs.
- 0 orphan attendance/grade/fee rows found.

## Critical Issues

### 1. Public grants are far too broad

Status: fixed in production by `strict_grants_rls_hardening`.

Every audited public table/view grants all major privileges to `anon` and `authenticated`:

```text
DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
```

Affected objects include:

- `students`
- `user_profiles`
- `attendance_logs`
- `attendance_spam_logs`
- `hardware_scan_debounce`
- `timetables`
- `grades`
- `grade_records`
- `student_fees`
- `fee_notices`
- `chat_messages`
- `announcements`

RLS still blocks operations that do not have matching policies, but this grant baseline is not acceptable for a SaaS school system. It increases blast radius if a broad policy is added later and conflicts with the project's security baseline.

Recommended fix:

- Revoke broad privileges from `anon` on all student/parent/school data.
- Grant only the minimum privileges needed for `authenticated`.
- Keep backend writes through service role/server routes.
- Re-check Data API access after every revoke.

### 2. Several policies expose cross-school data to any authenticated user

Status: fixed in production by `strict_grants_rls_hardening`.

Policies using `qual=true` for `authenticated`:

- `announcements`: `Anyone can view announcements`
- `chat_messages`: `Anyone can view chat`
- `fee_notices`: `Anyone can view fee notices`
- `timetables`: `timetables_admin_policy` is `ALL` with `USING true` and `WITH CHECK true`

This means any authenticated user can read those datasets across all schools. For `timetables`, any authenticated user can also insert/update/delete through Data API because the policy is `ALL`.

Recommended fix:

- Replace `true` policies with role-aware and `school_id`-scoped policies.
- Parent read policies should only expose linked children/class data.
- Admin/teacher policies should require matching `user_profiles.school_id`.
- Avoid direct client writes unless the role and school are verified in policy.

### 3. `students` has an `anon` SELECT policy for all rows

Status: fixed in production by `strict_grants_rls_hardening`; the collector no longer reads Supabase directly with the anon key.

Policy:

```text
zk_agent_read_students
roles: anon
cmd: SELECT
qual: true
```

This is currently used by the C# collector to load `ma_cham_cong -> student_code` through the public anon key. It exposes the students map to any holder of the anon key.

Recommended fix:

- Stop direct collector reads from Supabase with anon key.
- Move the student-map lookup behind backend `/api/v1/hardware` with `hardwareApiKey`, or use an Edge Function/server-side service role path with explicit device auth.
- Revoke anon read from `students` after the collector no longer depends on it.

### 4. Attendance RPC/function lookup is not school-scoped

Status: fixed for the database RPC, backend route, AI-X1 collector payload, and Edge Function lookup.

Database function `insert_attendance_from_device` accepts `p_school_id`, but finds a student by:

```sql
where s.ma_cham_cong = p_ma_cham_cong
limit 1
```

It does not filter by `s.school_id = p_school_id`.

Risk:

- When multiple schools use the same device enroll number, attendance can be written for the wrong school's student.

This same issue appears in the Supabase Edge Function `supabase/functions/attendance-collector/index.ts`, which queries by `ma_cham_cong` only and `limit(1)`.

Recommended fix:

- Include `school_id` in the device payload or resolve school from authenticated device config.
- Query students by both `school_id` and `ma_cham_cong`.
- Add a unique index on `(school_id, ma_cham_cong)` where `ma_cham_cong is not null`.

### 5. `handle_new_user` trusts `raw_user_meta_data`

Status: mitigated in production by `strict_grants_rls_hardening` and backend parent registration changes.

Function `handle_new_user` sets profile `role` and `school_id` from:

```sql
NEW.raw_user_meta_data->>'role'
NEW.raw_user_meta_data->>'school_id'
```

Supabase user metadata is user-editable in many flows and must not be trusted for authorization. This can create incorrect roles/school mappings if signup is exposed.

Recommended fix:

- Do not set authorization-critical fields from user-editable metadata.
- Parent signup should create a parent profile through backend-validated link code flow.
- Admin/teacher roles should be assigned server-side only.
- Consider moving trusted role/school source to backend-controlled profile creation or app metadata.

### 6. Security definer functions live in exposed `public` schema

Security definer functions:

- `public.handle_new_user`
- `public.rls_auto_enable`

Supabase guidance is to avoid security definer functions in exposed schemas when possible. `rls_auto_enable` has `search_path` set, but `handle_new_user` does not.

Recommended fix:

- Move privileged functions to a private schema if practical.
- At minimum, set a safe `search_path` and revoke direct execute where not needed.

### 7. Backend calls a missing RPC and falls back every scan

Status: fixed in production by `foundation_multi_tenant_non_breaking`.

Local backend code calls:

```text
record_attendance_with_spam_check
```

But the database functions found are only:

- `handle_new_user`
- `insert_attendance_from_device`
- `rls_auto_enable`
- `update_updated_at_column`

So `recordAttendanceCore` falls back to manual insert whenever the RPC is missing. This keeps attendance working, but the intended DB-side spam/check-in logic is not actually installed.

Recommended fix:

- Either create the missing RPC in a proper migration, or remove the RPC path and make the manual backend path the official implementation.
- Do not leave a permanent "missing RPC fallback" as the normal production path.

### 8. `SUPABASE_DB_URL` / pg-boss queue is disabled

Local env shows:

```text
ENABLE_ATTENDANCE_QUEUE=false
```

The current `SUPABASE_DB_URL` is documented as stale/wrong. Therefore pg-boss worker is disabled and async side effects are not reliable.

Recommended fix:

- Replace `SUPABASE_DB_URL` with the exact current Dashboard connection string.
- Re-enable queue only after a successful connection test.
- Decide whether queue is truly needed if direct attendance write is the canonical path.

### 9. Fee data model is split and inconsistent

There are two fee tables:

- `student_fees`
- `fee_notices`

They overlap heavily but have different conventions:

- `student_fees.payment_status`: `pending | partial | paid`
- `fee_notices.payment_status`: `unpaid | partial | paid`
- `student_fees.subject_fees` default: `[]`
- `fee_notices.subject_fees` default: `{}`

Code currently uses `fee_notices` in admin/mobile flows, while `student_fees` still exists with data.

Recommended fix:

- Pick one canonical fee table.
- Migrate any needed data.
- Archive/drop the unused table only after code no longer references it.

### 10. `students.student_code` is globally unique, not tenant-scoped

Status: partially mitigated. `(school_id, student_code)` uniqueness exists, but the old global unique constraint remains intentionally until code and data flows are regression-tested.

Current unique constraint:

```text
UNIQUE (student_code)
```

For SaaS, this should normally be:

```text
UNIQUE (school_id, student_code)
```

Risk:

- Two schools cannot both use a student code like `HS001`.

Recommended fix:

- Replace the global unique constraint with a tenant-scoped unique constraint after checking existing duplicates.

## Medium Issues

### 11. Edge Function `attendance-collector` is active but overlaps backend collector flow

Edge Function:

- status: `ACTIVE`
- `verify_jwt: true`
- uses `SUPABASE_SERVICE_ROLE_KEY`
- CORS allows `*`
- finds student by `ma_cham_cong` only

The current runbook says the active flow is:

```text
AI-X1 collector -> backend /api/v1/hardware/scan -> Supabase
```

The Edge Function may be an old/parallel path. Keeping two attendance ingestion paths increases drift.

Recommended fix:

- Decide canonical ingestion path.
- If backend route is canonical, disable/archive Edge Function after confirming no device calls it.
- If Edge Function is canonical, add device auth and school-scoped lookup.

### 12. C# collector hardcodes runtime config and anon key

File:

```text
hardware-collector/ronald-jack-aix1/Program.cs
```

Hardcoded items:

- `SCHOOL_ID`
- `BACKEND_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON`
- device IP/port

Recommended fix:

- Move these to config/env.
- Remove direct Supabase read from collector.
- Keep device-to-cloud communication through backend with an API key.

### 13. Admin Web route trusts `x-school-id`

Admin Web routes use:

```text
x-school-id || 1
```

and are mounted with "NO AUTH REQUIRED (internal network only)" comment.

Risk:

- In real SaaS deployment this is not enough. Any caller who reaches the backend can switch tenant by header.

Recommended fix:

- Put admin auth back in front of Web Admin routes before production.
- Resolve `school_id` from authenticated admin profile, not from client header.

### 14. FCM is not fully enabled locally

`FIREBASE_SERVICE_ACCOUNT_JSON` is not configured in local `.env`, so notifications may be logged only.

Recommended fix:

- Configure Firebase credentials in server-only environment.
- Test foreground/background/terminated app notification behavior.

## Things That Look Good

- Project is active and healthy.
- Project is already on Postgres 17.
- All public base tables have `school_id`.
- All audited public base tables have RLS enabled.
- `grade_records` view has `security_invoker=on`.
- No orphan attendance/grade/fee rows found.
- Existing data is small and easy to migrate/clean before scaling.

## Recommended Fix Order

1. Regression-test Admin Web and Parent App screens against strict grants/RLS.
2. Decide canonical attendance ingestion path: backend route vs Edge Function.
3. Correct `SUPABASE_DB_URL` and decide whether to re-enable pg-boss.
4. Normalize fees (`fee_notices` vs `student_fees`).
5. Move collector runtime config out of code.
6. Make Admin Web resolve `school_id` from authenticated admin profile, not `x-school-id`.
7. Drop global `students.student_code` uniqueness only after tenant-scoped flows are verified.
8. Add tests/checklists for Data API access by role for every new module.

## Safe Next Step

Strict grants/RLS are already active in production. The safe next step is regression testing and fixing any screen/API path that still depended on the old broad grants.

Suggested verification before applying any security migration:

- Admin can list/create/update students.
- Parent can see only linked students.
- Parent can see only linked attendance/timetable/fees/grades.
- Hardware collector can resolve only its configured school's students.
- Anonymous callers cannot read student, fee, timetable, chat, or attendance data.
