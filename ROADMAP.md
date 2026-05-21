# ROADMAP - SYNO

This roadmap is aligned with:

```text
C:\Users\ASUS\OneDrive\Documents\Báo cáo kế hoạch dự án App phụ huynh mô hình Saas.docx
```

## Phase 1 - Foundation

Status: prototype foundation mostly complete.

- Web Admin basic dashboard
- Parent App basic interface and login path
- Supabase/Postgres schema
- AI-X1 collector technical proof
- Student and parent data foundation

## Phase 2 - Data And Feature Expansion

Status: in progress.

- Normalize backend and Supabase schema for SaaS/multi-school
- Improve Web Admin data management
- Add/import timetable data
- Add/import grades
- Add/import fees and payment status
- Build FCM realtime notification path
- Add API integration/sync monitoring for school systems

## Phase 3 - Security And Device Testing

Status: pending.

- Audit RLS policies and Data API grants
- Verify `school_id` isolation across admin and parent flows
- Test Android/iOS devices
- Test weak-network behavior
- Test notification foreground/background/terminated states
- Remove hardcoded runtime config from collector/backend paths

## Phase 4 - Release And SaaS Operations

Status: pending.

- Beta test with real parents/admins
- Deploy Web Admin and backend production path
- Prepare CH Play/App Store assets and privacy policy
- Import real school data
- Operate tenant/school management
- Add monitoring and support workflow

## Later Smart School Modules

- Spending statistics
- Menu/nutrition
- Leave requests
- School health
- School bus tracking
