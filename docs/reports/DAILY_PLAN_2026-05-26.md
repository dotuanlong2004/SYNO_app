# SYNO Daily Plan - 2026-05-26

## Guardrails

- Follow current source of truth: `CURRENT_STATUS.md`, `PROJECT_MEMORY_SYNO.md`, `HUONG_DAN_CHAY_AI_X1.md`, `ROADMAP.md`, and current code/database behavior.
- Do not use archived markdown as active workflow.
- Keep every business path scoped by `school_id`.
- Verify, commit, and push after each meaningful slice.

## Priority Order

### Slice 1 - FCM Readiness Hardening

Status: completed and pushed in `c8f48eae`.

- Centralize FCM token validation and persistence in backend.
- Make `/api/v1/users/fcm-token` surface Supabase update failures.
- Align legacy `/api/v1/mobile/fcm-token` with the same `user_profiles` write path.
- Add backend contract coverage.
- Verification: `corepack pnpm --filter backend test`.

### Slice 2 - Documentation Alignment

Status: completed and pushed in `c8f48eae`.

- Keep AI-X1 collector docs aligned with the current backend-only ingestion path.
- Remove guidance that asks developers to edit `Program.cs` or configure Supabase anon keys in collector runtime.
- Verification: `dotnet build hardware-collector/ronald-jack-aix1 -c Release`, `git diff --check`.

### Slice 3 - Admin Web Feature Polish

Status: completed and pushed in `b473a3e4`.

- Audit timetable, grades, fees, announcements flows against current API contracts.
- Prefer small UX/API consistency fixes that do not require schema changes.
- Verification: `corepack pnpm --filter admin_web run typecheck` and `corepack pnpm --filter admin_web run build`.
- Completed slice: fee notices now require a resolved school-scoped student before create/update/import, preventing orphan fee rows.

### Slice 4 - Parent App Feature Polish

Status: completed and pushed in `22c07bbe`.

- Audit attendance, timetable, grades, fees, announcements screens for stale text, token handling, and refresh behavior.
- Avoid device-specific FCM claims unless tested on a real device token.
- Verification: `flutter analyze` and `flutter test` from `attendance_app`.
- Completed slice: live backend integration test is now opt-in so default `flutter test` is stable without a running backend; live test remains available with `--dart-define=RUN_LIVE_BACKEND_TESTS=true`.

### Slice 5 - Hardware Deployment Check

Status: waiting for real runtime/device window.

- Run backend on port `3000`.
- Run `hardware-collector/ronald-jack-aix1/run-collector.ps1`.
- Confirm `HARDWARE_API_KEY` path and one real scan if the AI-X1 device is reachable.

### Slice 6 - Real Push Test

Status: helper in progress; waiting for real device token.

- Capture an app FCM token from a real parent device/session.
- Trigger attendance notification path.
- Verify foreground/background/terminated behavior.
- Helper command once a user has `fcm_token`:
  `corepack pnpm --filter backend run fcm:test-push -- --email=<parent-email>`

### Slice 7 - Admin Announcement Push

Status: completed; committed and pushed in the current slice.

- Add explicit opt-in push checkbox for Admin Web announcements.
- Keep announcement creation independent from FCM delivery failures.
- Send only to parent profiles in the current `school_id` that have an `fcm_token`.
- Add backend contract coverage for announcement payload and FCM payload building.
- Verification: `corepack pnpm --filter backend test`, `corepack pnpm --filter admin_web run typecheck`, `corepack pnpm --filter admin_web run build`, `git diff --check`.

### Slice 8 - Grade Import Validation

Status: completed; committed and pushed in the current slice.

- Centralize Admin Web grade payload building.
- Validate scores are numeric and within the 0-10 school grading scale.
- Stop bulk grade import on unknown `student_code` instead of silently skipping rows.
- Verification: `corepack pnpm --filter backend test`, `git diff --check`.

### Slice 9 - Timetable Import Validation

Status: completed; committed and pushed in the current slice.

- Centralize Admin Web timetable payload building.
- Validate `day_of_week` is 1-7 and time values use `HH:mm`.
- Prevent invalid timetable imports from being silently defaulted to Monday/default times.
- Verification: `corepack pnpm --filter backend test`, `git diff --check`.
