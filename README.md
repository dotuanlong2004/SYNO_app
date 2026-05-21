# SYNO Attendance App

SYNO is a Smart School SaaS platform for school admins and parents. The current implementation includes:

- React Web Admin
- Flutter parent app
- Node/Express backend
- Supabase/PostgreSQL database
- Ronald Jack AI-X1 attendance collector
- Firebase Cloud Messaging integration path

## Current Source Of Truth

Read these files first before changing code:

1. `PROJECT_MEMORY_SYNO.md` - persistent engineering context and security rules.
2. `CURRENT_STATUS.md` - current implementation state and known issues.
3. `HUONG_DAN_CHAY_AI_X1.md` - confirmed AI-X1 collector runbook.
4. `ROADMAP.md` - current product roadmap aligned with the planning document.

Older markdown files were moved to:

```text
Lưu trữ tài liệu dự án/markdown_cu_2026-05-20
```

They are kept for history only and should not be treated as the current workflow.

## Supabase Project

- Project name: `SYNO APP`
- Project ref: `bimepdqcwpsynjimvenn`
- Region: `ap-southeast-1`
- Status checked on 2026-05-20: `ACTIVE_HEALTHY`

## Current Run Flow

Backend:

```bat
cmd /c "cd /d d:\attendance_app_dev\backend && npm start"
```

AI-X1 collector:

```bat
dotnet build d:\attendance_app_dev\hardware-collector\ronald-jack-aix1 -c Release
d:\attendance_app_dev\hardware-collector\ronald-jack-aix1\bin\Release\net472\TestCOMReflect.exe
```

The old `C:\ZKCollector\x86\ZKCollector.exe --console` flow is no longer the current AI-X1 path.
