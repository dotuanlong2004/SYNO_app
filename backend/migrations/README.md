# Database Migrations

Cấu trúc migrations chuẩn thương mại cho hệ thống điểm danh học sinh.

## 📁 Cấu trúc thư mục

```
migrations/
├── core/                    # Foundation tables (chạy đầu tiên)
│   ├── 001_auth_schema.sql
│   ├── 002_students_schema.sql
│   └── 003_base_tables.sql
│
├── features/                # Feature-specific tables
│   ├── 001_attendance.sql
│   ├── 002_timetable.sql
│   ├── 003_fees.sql
│   ├── 004_grades.sql
│   └── 005_announcements.sql
│
├── fixes/                   # Bug fixes và patches
│   └── 001_column_fixes.sql
│
└── seeds/                   # Test data (chạy cuối)
    └── 001_initial_data.sql
```

## 🚀 Chạy trên Supabase

### Bước 1: Core Schema
Chạy các file trong `core/` theo thứ tự:
1. `001_auth_schema.sql`
2. `002_students_schema.sql`

### Bước 2: Features
Chạy các file trong `features/` (có thể song song):
- `001_attendance.sql`
- `002_timetable.sql`
- `003_fees.sql`
- `004_grades.sql`
- `005_announcements.sql`

### Bước 3: Seeds (tùy chọn)
Chạy `seeds/001_initial_data.sql` để thêm dữ liệu test.

## 🔄 Dependencies

```
core/001_auth_schema.sql
    └── core/002_students_schema.sql (cần auth.users)
        └── features/*.sql (cần students.id)
```

## ⚠️ Lưu ý

- Luôn chạy `core` trước `features`
- Chạy từng file riêng biệt trong Supabase SQL Editor
- Mỗi file có `DROP IF EXISTS` để idempotent
