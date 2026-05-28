# Parent Data Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Admin Web learning data for the linked parent account appear reliably in the Parent App for timetable, fees, grades, and announcements.

**Architecture:** Fix backend parent context resolution so the linked `students` row is the source of truth for `student_code` and `class_id`. Seed one verified tenant-scoped dataset for `HS0085` / `10C2`. Add a lightweight Parent App auto-refresh tick for learning data until a fuller push/realtime channel is built.

**Tech Stack:** Node/Express, Supabase/Postgres, React Admin Web, Flutter/Riverpod Parent App.

---

### Task 1: Backend Parent Context

**Files:**
- Modify: `backend/src/middleware/mobileAuth.ts`
- Create: `backend/src/services/mobileUserContext.ts`
- Create: `backend/scripts/mobile-user-context-contract.test.ts`

- [ ] Write a failing contract test showing a parent with stale profile `class_id=12A1` resolves to linked student `class_name=10C2`.
- [ ] Implement `resolveMobileUserContext` using `students.parent_id + school_id` as the first source for parent `student_code/class_id`.
- [ ] Update `mobileAuth` to call `resolveMobileUserContext`.
- [ ] Run `corepack pnpm --filter backend test`.

### Task 2: Demo Data Reset

**Files:**
- Data only: Supabase production project `bimepdqcwpsynjimvenn`, tenant `school_id=1`.

- [ ] Verify linked student target is `HS0085` / `Long` / `10C2`.
- [ ] Delete old `public.timetables` rows for `school_id=1`.
- [ ] Insert a compact `10C2` timetable for Monday-Saturday.
- [ ] Insert fee notice and grade records for `HS0085`.
- [ ] Insert one parent-visible announcement.
- [ ] Query counts and rows to confirm app-facing data exists.

### Task 3: Parent App Auto Refresh

**Files:**
- Modify: `attendance_app/lib/presentation/providers/dashboard_providers.dart`

- [ ] Add a Riverpod stream tick that fires every 3 seconds.
- [ ] Make timetable, fee, grade, and announcement providers watch the tick so the app refreshes after Admin Web changes.
- [ ] Run `flutter analyze`.

### Task 4: Emulator

**Files:**
- No repo changes.

- [ ] Stop heavy `Pixel_10_Pro_XL` if needed.
- [ ] Prefer an existing lighter AVD if available; otherwise run the current AVD with reduced load only for verification.
- [ ] Build, install, and launch the app.
