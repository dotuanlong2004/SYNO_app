# Hướng Dẫn Cài Đặt Supabase Backend

## Tổng Quan Migration

Hệ thống đã được migrate từ PostgreSQL local + Redis + BullMQ sang **Supabase PostgreSQL + pg-boss**.

## Các Thay Đổi Chính

| Cũ | Mới |
|----|-----|
| PostgreSQL local | Supabase PostgreSQL Cloud |
| Redis (debounce, spam) | PostgreSQL tables + pg_cron |
| BullMQ (queue) | pg-boss (queue trên PostgreSQL) |
| `DATABASE_URL` | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| `REDIS_URL` | Đã xóa, không cần nữa |

## Biến Môi Trường (.env)

```env
# Supabase (BẮT BUỘC)
SUPABASE_URL=https://bimepdqcwpsynjimvenn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
SUPABASE_ANON_KEY=<your-supabase-anon-key>

# Direct DB URL cho pg-boss (lấy từ Supabase Dashboard > Settings > Database)
SUPABASE_DB_URL=postgresql://postgres:[password]@db.bimepdqcwpsynjimvenn.supabase.co:5432/postgres

# JWT (giữ nguyên)
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Firebase Admin (giữ nguyên)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Optional
PORT=3000
ENABLE_HARDWARE_ROUTE=true
ENABLE_ATTENDANCE_QUEUE=true
```

## Các Bước Setup

### 1. Cài Dependencies

```bash
cd backend
npm install
```

### 2. Chạy Migration Schema

```bash
npm run db:migrate
```

Script này sẽ:
- Tạo tất cả tables trên Supabase
- Setup indexes, RLS policies
- Tạo RPC functions cho transactions
- Setup pg_cron jobs cho cleanup

### 3. Khởi Động Server

```bash
npm run dev
```

### 4. Kiểm Tra Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "ok": true,
  "supabase": "up",
  "queue": "enabled"
}
```

## Các Script Hỗ Trợ

| Script | Mô tả |
|--------|-------|
| `npm run db:migrate` | Apply schema lên Supabase |
| `npm run db:setup` | Alias của migrate |
| `npm start` | Chạy production |
| `npm run dev` | Chạy development (watch mode) |

## Troubleshooting

### Lỗi "Queue disabled: SUPABASE_DB_URL not set"
- Cần thêm `SUPABASE_DB_URL` để pg-boss kết nối trực tiếp PostgreSQL
- Lấy URL từ Supabase Dashboard > Project Settings > Database > Connection string

### Lỗi "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
- Kiểm tra file `.env` đã tồn tại và có đúng các biến trên

### Lỗi Migration Fail
- Kiểm tra service role key có đúng không
- Kiểm tra project đã enable PostgreSQL chưa
- Thử chạy lại `npm run db:migrate`

## Kiến Trúc Mới

```
┌─────────────────┐     ┌──────────────────┐
│   ZK Agent      │────▶│  Hardware API    │
└─────────────────┘     └────────┬─────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    pg-boss Queue        │
                    │  (Supabase PostgreSQL)  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Attendance Worker       │
                    │  (Process scan jobs)      │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Supabase PostgreSQL   │
                    │  (Students, Logs, Users)  │
                    └─────────────────────────┘
```

## RPC Functions Đã Tạo

- `register_parent_with_student()` - Đăng ký phụ huynh + liên kết học sinh (atomic)
- `provision_parent_account()` - Tạo tài khoản phụ huynh (admin)
- `record_attendance_with_spam_check()` - Ghi nhận điểm danh + spam check

## Cleanup Jobs (pg_cron)

- `cleanup_spam_blocks` - Xóa spam blocks cũ (> 30 phút)
- `cleanup_debounce_entries` - Xóa debounce entries cũ (> 10 phút)
- `cleanup_old_refresh_tokens` - Xóa refresh tokens hết hạn
