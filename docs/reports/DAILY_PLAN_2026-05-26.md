# SYNO Daily Plan - 2026-05-26

## Guardrails

- Follow current source of truth: `CURRENT_STATUS.md`, `PROJECT_MEMORY_SYNO.md`, `HUONG_DAN_CHAY_AI_X1.md`, `ROADMAP.md`, and current code/database behavior.
- Do not use archived markdown as active workflow.
- Keep every business path scoped by `school_id`.
- Verify, commit, and push after each meaningful slice.

## Priority Order

### Slice 1 - FCM Readiness Hardening

Status: in progress.

- Centralize FCM token validation and persistence in backend.
- Make `/api/v1/users/fcm-token` surface Supabase update failures.
- Align legacy `/api/v1/mobile/fcm-token` with the same `user_profiles` write path.
- Add backend contract coverage.
- Verification: `corepack pnpm --filter backend test`.

### Slice 2 - Documentation Alignment

Status: in progress.

- Keep AI-X1 collector docs aligned with the current backend-only ingestion path.
- Remove guidance that asks developers to edit `Program.cs` or configure Supabase anon keys in collector runtime.
- Verification: `dotnet build hardware-collector/ronald-jack-aix1 -c Release`, `git diff --check`.

### Slice 3 - Admin Web Feature Polish

Status: next.

- Audit timetable, grades, fees, announcements flows against current API contracts.
- Prefer small UX/API consistency fixes that do not require schema changes.
- Verification: `corepack pnpm --filter admin_web run typecheck` and `corepack pnpm --filter admin_web run build`.

### Slice 4 - Parent App Feature Polish

Status: next.

- Audit attendance, timetable, grades, fees, announcements screens for stale text, token handling, and refresh behavior.
- Avoid device-specific FCM claims unless tested on a real device token.
- Verification: `flutter analyze` and `flutter test` from `attendance_app`.

### Slice 5 - Hardware Deployment Check

Status: waiting for real runtime/device window.

- Run backend on port `3000`.
- Run `hardware-collector/ronald-jack-aix1/run-collector.ps1`.
- Confirm `HARDWARE_API_KEY` path and one real scan if the AI-X1 device is reachable.

### Slice 6 - Real Push Test

Status: waiting for real device token.

- Capture an app FCM token from a real parent device/session.
- Trigger attendance notification path.
- Verify foreground/background/terminated behavior.
