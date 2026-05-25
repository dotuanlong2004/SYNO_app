# CURRENT STATUS - SYNO

Last checked: 2026-05-25

## Project

- Product name: SYNO
- Model: Smart School SaaS Platform
- Main modules: School Admin Web, Super Admin Web, Parent App, Backend API, Supabase/Postgres, AI-X1 collector, FCM notification path
- Supabase project: `SYNO APP`
- Supabase ref: `bimepdqcwpsynjimvenn`
- Production school tenant: `1` - Huu Nghi School (HNS), website `https://hns.edu.vn/`, levels `primary`, `secondary`, `high_school`

## Confirmed Working

- Supabase connector works and project is `ACTIVE_HEALTHY`.
- Public database tables exist and RLS is enabled.
- Strict production RLS/grants hardening has been applied after explicit user approval:
  - no `anon` table grants remain on audited public business tables;
  - broad `USING true` authenticated policies were replaced with role + `school_id` scoped policies;
  - `user_profiles` authenticated update is limited to `full_name`, `fcm_token`, and `updated_at`;
  - all tenant `school_id` foreign keys are validated.
- Existing production data has been migrated from `default_school` to school tenant `1`.
- Attendance RPC overloads now default to school tenant `1`, including legacy overloads.
- Legacy Supabase Auth user metadata has been cleaned so stale `school_id=default_school` entries now use `school_id=1`.
- Verified after tenant cutover:
  - backend health returns Supabase `up`;
  - Admin Web students/timetables/fees endpoints return `ok:true` for `school_id=1`;
  - backend login works for `teacher1@school.edu` and returns `school_id=1`;
  - attendance RPC insert path resolves `ma_cham_cong=1` to `HS0085` inside a rollback transaction;
  - Admin Web production build passes;
  - Parent App `flutter analyze` passes with no issues;
  - Parent App `flutter test` passes.
- Edge Function `attendance-collector` exists and is active.
- Multi-tenant foundation migration `foundation_multi_tenant_non_breaking` has been applied:
  - `public.schools`
  - `app_private` RLS helper functions
  - tenant-scoped indexes
  - missing `record_attendance_with_spam_check` RPC
  - school-scoped `insert_attendance_from_device`
- Backend `/api/v1/hardware/scan` now accepts `ma_cham_cong` and resolves the student server-side by `school_id`.
- Node projects have been migrated from npm lockfiles to pnpm workspace:
  - root `pnpm-workspace.yaml`
  - `packageManager: pnpm@11.1.3`
  - old `package-lock.json` files removed.
- Backend code has been migrated from `.js` to `.ts`; production starts from compiled `dist/src/server.js`.
- Admin Web code/config has been migrated from `.jsx/.js` to `.tsx/.ts`.
- Deprecated `zk-agent` and `ZKCollector` experiments were removed from the active workspace. The current hardware path is `hardware-collector/ronald-jack-aix1`.
- No `package-lock.json` or active `.js/.jsx` files remain in the Node workspace.
- Backend `corepack pnpm --filter backend test` is no longer a placeholder. It now runs:
  - TypeScript typecheck for active backend `src` files and test scripts;
  - status-code smoke tests that start the Express app on a temporary port;
  - guards that reject `ok:false` with HTTP 2xx and require clear `error/message` on HTTP 4xx/5xx.
- Backend app/server was split so tests and production use the same Express app factory:
  - `backend/src/app.ts`
  - `backend/src/server.ts`
- Production health can be hardened with `REQUIRE_ATTENDANCE_QUEUE=true`; if the queue is required but disabled/missing DB URL, `/health` returns `503` instead of a false-green `200`.
- `corepack pnpm --filter backend run check:production` passes with the current local `.env`.
- AI-X1 collector no longer reads Supabase directly with the anon key.
- Backend API runs on port `3000`.
- Super Admin is separated from the school Admin Web:
  - `admin_web` is only for school-scoped `admin` and `teacher` accounts.
  - `super_admin_web` is a dedicated React app for platform `super_admin`.
  - Platform API routes are mounted under `/api/v1/platform-admin`.
  - `super_admin` profiles are platform-scoped with `school_id = null`; do not attach them to school tenant `1`.
  - Test Super Admin account is `superadmin@syno.local` with password `123456`.
- Ronald Jack AI-X1 collector builds and runs from:

```text
hardware-collector/ronald-jack-aix1
```

- AI-X1 connection was confirmed with:

```text
Device: 192.168.0.225:4370
Serial: AYTD01032550
History read: 58 records
Polling: 3s
```

## Known Issues

1. `SUPABASE_DB_URL` has been corrected locally.
   - Pooler host `aws-1-ap-southeast-1.pooler.supabase.com:5432` with user `postgres.bimepdqcwpsynjimvenn` accepts the provided DB password.
   - Direct host `db.bimepdqcwpsynjimvenn.supabase.co:5432` is IPv6-only from this Windows network, so local runtime should use the pooler URL.
   - `ENABLE_ATTENDANCE_QUEUE=true` and `REQUIRE_ATTENDANCE_QUEUE=true` are set in local `backend/.env`.
   - Production build test on port `3104` started pg-boss successfully and `/health` returned `queue:"enabled"`.

2. FCM local env points to `backend/firebase-service-account.json` through `GOOGLE_APPLICATION_CREDENTIALS`.
   - Production readiness sees Firebase Admin credentials as present.
   - A real device push still needs an end-to-end device-token test.

3. Collector runtime config now reads from environment variables.
   - Defaults remain the verified dev values: AI-X1 `192.168.0.225:4370`, `school_id=1`, backend hardware scan URL on local port `3000`.
   - Production should set `HARDWARE_API_KEY` and `COLLECTOR_REQUIRE_HARDWARE_API_KEY=true`.
   - `hardware-collector/ronald-jack-aix1/run-collector.ps1` reads `HARDWARE_API_KEY` from `backend/.env`, sets `COLLECTOR_REQUIRE_HARDWARE_API_KEY=true`, and refuses to run if the key is missing.
   - Latest `dotnet build hardware-collector/ronald-jack-aix1 -c Release` passed with 0 warnings and 0 errors.

4. Repo snapshot was stabilized and pushed on 2026-05-25.
   - Latest pushed commit: `bec51701 chore: stabilize SYNO admin platform progress`.
   - Local `main` is synced with `origin/main` after user pushed the commit.
   - Generated build outputs remain ignored; avoid committing `bin`, `obj`, `.dart_tool`, `build`, or `dist`.

5. Multi-school isolation is the core SaaS requirement.
   - Every business query must remain scoped by `school_id`.
   - Do not bypass RLS or expose `service_role` to frontend clients.

## Active Database Surface

Important public tables/views include:

- `user_profiles`
- `students`
- `attendance_logs`
- `attendance_spam_logs`
- `hardware_scan_debounce`
- `timetables`
- `grades`
- `grade_records` view
- `student_fees`
- `fee_notices`
- `chat_messages`
- `announcements`

## Current Priority

1. Run a real end-to-end Firebase device-token push test.
2. For real AI-X1 deployment, run the collector through `hardware-collector/ronald-jack-aix1/run-collector.ps1` or set the same `HARDWARE_API_KEY` and `COLLECTOR_REQUIRE_HARDWARE_API_KEY=true` in the service environment.
3. Continue Web Admin and Parent App features for timetable, grades, fees, and announcements.
4. Keep documentation current and avoid using archived markdown as workflow guidance.
5. Keep pnpm/TypeScript regression gates green after every DB/RLS/API change.
