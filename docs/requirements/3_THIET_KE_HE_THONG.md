# TÀI LIỆU PHÂN TÍCH THIẾT KẾ HỆ THỐNG
## Dự án SYNO - Nền tảng Quản lý Trường học Thông minh

---

## 1. Giới thiệu

Tài liệu này mô tả kiến trúc tổng thể, thiết kế chi tiết từng component, luồng xử lý dữ liệu, và các giải pháp kỹ thuật của hệ thống SYNO.

---

## 2. Kiến trúc hệ thống tổng thể

### 2.1 Sơ đồ kiến trúc cao cấp

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                │
├──────────────────┬──────────────────┬──────────────────────────────┤
│  Web Admin       │  Parent App      │  Hardware Device             │
│  (React/TS)      │  (Flutter)       │  (Ronald Jack AI-X1)         │
│  Port: 3001      │  iOS/Android     │  IP: 192.168.0.225:4370     │
└──────────┬───────┴────────┬─────────┴──────────────┬────────────────┘
           │                │                        │
           └────────────────┼────────────────────────┘
                            │ HTTPS/TCP
┌───────────────────────────▼────────────────────────────────────────┐
│                      API Gateway / Backend                          │
├────────────────────────────────────────────────────────────────────┤
│  Node.js / Express                                                 │
│  Port: 3000                                                        │
│  ├─ Authentication (JWT/Supabase Auth)                             │
│  ├─ Hardware Scan Handler                                         │
│  ├─ Business Logic Services                                       │
│  ├─ Notification Service (FCM)                                    │
│  ├─ Queue Service (pg-boss)                                       │
│  └─ Health Check & Monitoring                                     │
└───────────┬──────────────────────────────────────────┬─────────────┘
            │                                          │
            │ HTTPS/JSON                   TCP/pgBouncer
            │                                          │
┌───────────▼──────────────────┐      ┌────────────────▼────────────┐
│   Supabase / PostgreSQL       │      │   Firebase Cloud Messaging  │
├──────────────────────────────┤      ├─────────────────────────────┤
│  Database (public)           │      │  Push Notification Service  │
│  ├─ schools                  │      │  ├─ Android FCM            │
│  ├─ students                 │      │  └─ iOS FCM               │
│  ├─ user_profiles            │      └─────────────────────────────┘
│  ├─ attendance_logs          │
│  ├─ timetables               │
│  ├─ grades                   │
│  ├─ student_fees             │
│  ├─ announcements            │
│  ├─ chat_messages            │
│  ├─ hardware_scan_debounce   │
│  └─ [RLS Policies & Grants]  │
│                              │
│  Realtime Subscriptions      │
│  ├─ attendance updates       │
│  └─ announcement broadcasts  │
└──────────────────────────────┘
```

### 2.2 Các tầng kiến trúc

| Tầng | Thành phần | Công nghệ | Mục đích |
|------|-----------|-----------|---------|
| Presentation | Web Admin, Parent App | React/TS, Flutter | Giao diện người dùng |
| API | Backend | Node.js/Express | Xử lý logic, bảo mật, định tuyến |
| Business | Services | TypeScript | Các luồng nghiệp vụ chính |
| Data | Supabase/PostgreSQL | PostgreSQL, RLS | Lưu trữ, truy cập dữ liệu |
| Integration | FCM, Realtime | Firebase, Supabase | Giao tiếp ngoài hệ thống |

---

## 3. Thiết kế dữ liệu

### 3.1 Sơ đồ ERD (Entity Relationship Diagram)

```
┌─────────────────┐
│    schools      │  Tenant (đa tenant)
├─────────────────┤
│ id (PK)         │
│ name            │
│ status          │
│ education_levels│
└────────┬────────┘
         │ 1:N
         │
    ┌────▼──────────────────────────────────┐
    │                                        │
    │                                        │
┌───▼─────────────────┐          ┌─────────▼──────────┐
│  user_profiles      │          │    students        │
├─────────────────────┤          ├────────────────────┤
│ id (uuid) (PK)      │          │ id (bigint) (PK)   │
│ school_id (FK)      │          │ school_id (FK)     │
│ role                │          │ student_code       │
│ fcm_token           │          │ full_name          │
│ student_code        │          │ date_of_birth      │
│ updated_at          │          │ class_id           │
│ full_name           │          │ ma_cham_cong       │
└─────────────────────┘          └────────┬───────────┘
         │ 1:N                             │ 1:N
         │                                │
    ┌────▼──────────────────────────────────┐
    │                                        │
┌───▼──────────────────────┐    ┌──────────▼─────────────┐
│  attendance_logs         │    │  timetables            │
├──────────────────────────┤    ├────────────────────────┤
│ id (bigint) (PK)         │    │ id (bigint) (PK)       │
│ school_id (FK)           │    │ school_id (FK)         │
│ student_id (FK)          │    │ class_id               │
│ scanned_at               │    │ subject_name           │
│ log_type                 │    │ day_of_week (2-7)      │
│ device_serial            │    │ period                 │
└──────────────────────────┘    │ start_time             │
                                │ end_time               │
    ┌──────────────────────────┐│ teacher_name           │
    │                          ││ room                   │
┌───▼──────────────────┐   ┌──▼▼────────────────────┐
│  grades              │   │  student_fees          │
├──────────────────────┤   ├────────────────────────┤
│ id (bigint) (PK)     │   │ id (bigint) (PK)       │
│ school_id (FK)       │   │ school_id (FK)         │
│ student_id (FK)      │   │ student_id (FK)        │
│ subject_name         │   │ fee_name               │
│ score_type           │   │ total_amount           │
│ score                │   │ paid_amount            │
│ semester             │   │ payment_status         │
│ average_score        │   │ due_date               │
└──────────────────────┘   └────────────────────────┘

┌─────────────────────────────────┐
│ hardware_scan_debounce (cache)  │
├─────────────────────────────────┤
│ id (bigint) (PK)                │
│ school_id (FK)                  │
│ student_code                    │
│ expires_at                      │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ announcements                   │
├─────────────────────────────────┤
│ id (bigint) (PK)                │
│ school_id (FK)                  │
│ title                           │
│ content                         │
│ priority (normal/high/urgent)   │
│ created_at                      │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ chat_messages                   │
├─────────────────────────────────┤
│ id (bigint) (PK)                │
│ school_id (FK)                  │
│ student_id (FK)                 │
│ sender_id (FK to user_profiles) │
│ message_text                    │
│ created_at                      │
└─────────────────────────────────┘
```

### 3.2 Ràng buộc quan trọng

| Ràng buộc | Loại | Mô tả |
|-----------|------|-------|
| school_id | Tenant Isolation | Mọi bảng nghiệp vụ phải có school_id |
| RLS Enable | Security | Bảo mật mức hàng phải bật |
| GRANT | Access Control | Cấp quyền rõ ràng cho authenticated/service_role |
| FK Validate | Data Integrity | Kiểm tra tham chiếu |
| UNIQUE | Uniqueness | Mã học sinh, mã chấm công, mã thông báo |
| CHECK | Domain | Ngày tháng, số tiền, điểm số (0-10) |

---

## 4. Luồng xử lý chính

### 4.1 Luồng điểm danh (Attendance Flow)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Step 1: Thiết bị quét                                               │
├─────────────────────────────────────────────────────────────────────┤
│ Học sinh quét thẻ/vân tay tại cổng trường                           │
│ → Thiết bị AI-X1 ghi nhận: (ma_cham_cong, timestamp)                │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────┐
│ Step 2: AI-X1 Collector (C# .NET)                                   │
├─────────────────────────────────────────────────────────────────────┤
│ • Polling thiết bị mỗi 3 giây (TCP/IP)                             │
│ • Đọc lịch sử từ thiết bị                                          │
│ • Gửi POST request: /api/v1/hardware/scan                          │
│ • Payload: { ma_cham_cong, scanned_at, device_serial, school_id }  │
│ • Headers: X-Hardware-Api-Key: <key>                               │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────┐
│ Step 3: Backend API Handler                                         │
├─────────────────────────────────────────────────────────────────────┤
│ POST /api/v1/hardware/scan handler:                                │
│ 1. Validate API key (X-Hardware-Api-Key)                           │
│ 2. Validate input (ma_cham_cong, scanned_at không trong tương lai)  │
│ 3. Kiểm tra duplicate (hardware_scan_debounce table)               │
│    - Nếu có bản ghi trong 30s cuối cùng → return 429 DUPLICATE     │
│ 4. Tra cứu học sinh:                                               │
│    SELECT * FROM students                                          │
│    WHERE school_id = $1 AND ma_cham_cong = $2                      │
│ 5. Nếu không tìm thấy → return 404                                 │
│ 6. Xác định log_type (check_in/check_out)                          │
│    - Mặc định check_in (hoặc dựa vào giờ trong ngày)               │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────┐
│ Step 4: Insert vào Database                                         │
├─────────────────────────────────────────────────────────────────────┤
│ INSERT INTO attendance_logs                                         │
│   (school_id, student_id, scanned_at, log_type, device_serial)     │
│ VALUES                                                              │
│   ($school_id, $student_id, $scanned_at, $log_type, $device_serial)│
│                                                                     │
│ Ghi nhận: hardware_scan_debounce                                    │
│ INSERT INTO hardware_scan_debounce                                  │
│   (school_id, student_code, expires_at)                            │
│ VALUES                                                              │
│   ($school_id, $student_code, NOW() + 30 seconds)                  │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────┐
│ Step 5: Lấy thông tin phụ huynh & FCM Token                         │
├─────────────────────────────────────────────────────────────────────┤
│ SELECT up.fcm_token                                                │
│ FROM user_profiles up                                              │
│ WHERE up.school_id = $school_id                                    │
│   AND up.id = (SELECT parent_id FROM students WHERE id = $student) │
│   AND up.fcm_token IS NOT NULL                                     │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────┐
│ Step 6: Gửi Firebase Cloud Messaging (FCM)                          │
├─────────────────────────────────────────────────────────────────────┤
│ FCM Payload:                                                        │
│ {                                                                   │
│   "token": "device_fcm_token",                                      │
│   "notification": {                                                │
│     "title": "Điểm danh học sinh",                                 │
│     "body": "{student_name} đã vào trường lúc {time}"               │
│   },                                                               │
│   "data": {                                                        │
│     "type": "attendance",                                          │
│     "student_code": "HS0085",                                      │
│     "student_name": "Nguyễn Thị Lan",                              │
│     "scanned_at": "2026-05-21T08:05:32+07:00",                     │
│     "log_type": "check_in",                                        │
│     "school_id": "1"                                               │
│   }                                                                │
│ }                                                                   │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────┐
│ Step 7: Phụ huynh nhận notification                                 │
├─────────────────────────────────────────────────────────────────────┤
│ Firebase push notification → Parent App (Flutter)                   │
│ • Foreground: App nhận data, hiển thị card                         │
│ • Background: Notification xảy ra, tap mở app                      │
│ • Terminated: Notification cached, tap khi mở                     │
│                                                                     │
│ App hiển thị:                                                       │
│ ┌─────────────────────────────────┐                               │
│ │ Điểm danh học sinh              │                               │
│ │ Nguyễn Thị Lan đã vào trường    │                               │
│ │ lúc 08:05                       │                               │
│ │ [Xem chi tiết]                  │                               │
│ └─────────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Luồng đăng nhập (Authentication Flow)

```
┌──────────────────────────────────────────────────┐
│ Frontend gửi: POST /api/v1/auth/login           │
│ Body: { email, password }                       │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│ Backend nhận request                            │
│ • Validate input (email format, password length)│
│ • Gọi Supabase Auth: signInWithPassword()       │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│ Supabase Auth xử lý                             │
│ • Hash mật khẩu                                 │
│ • So sánh với DB                                │
│ • Tạo JWT token (hết hạn 7 ngày)                │
│ • Return: access_token                          │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│ Backend lấy thông tin user                      │
│ SELECT * FROM user_profiles                    │
│ WHERE id = auth.uid() (từ JWT)                 │
│ → school_id, role, full_name, fcm_token        │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│ Return response                                  │
│ {                                               │
│   "success": true,                              │
│   "data": {                                     │
│     "access_token": "jwt_...",                  │
│     "user": {                                   │
│       "id": "uuid",                             │
│       "email": "...",                           │
│       "role": "admin",                          │
│       "school_id": "1",                         │
│       "full_name": "..."                        │
│     }                                           │
│   }                                             │
│ }                                               │
└──────────────────────────────────────────────────┘
```

---

## 5. Bảo mật

### 5.1 Quản lý token & xác thực
- **JWT Token:** Supabase Auth tạo JWT token, hết hạn 7 ngày
- **Refresh Token:** Lưu ở Supabase, sử dụng để lấy token mới
- **Header:** `Authorization: Bearer <jwt_token>`
- **Validation:** Backend kiểm tra JWT tại mỗi request

### 5.2 Row Level Security (RLS)

**Ví dụ chính sách RLS cho bảng students:**

```sql
-- Bật RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Chính sách: Quản trị viên có thể xem học sinh trong trường của họ
CREATE POLICY students_select_admin ON students
  FOR SELECT
  USING (
    school_id = (
      SELECT school_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Chính sách: Phụ huynh có thể xem con của họ
CREATE POLICY students_select_parent ON students
  FOR SELECT
  USING (
    parent_id = auth.uid()
  );

-- Cấp quyền
GRANT SELECT ON students TO authenticated;
```

### 5.3 API Key cho thiết bị hardware

**Cơ chế bảo mật:**
- Mỗi school có API key riêng để thiết bị sử dụng
- Header: `X-Hardware-Api-Key: <school_api_key>`
- Backend validate key trước khi xử lý scan
- Không expose key ở frontend

### 5.4 Không sử dụng service_role ở frontend
- **service_role:** Chỉ dùng ở backend, bypasses RLS
- **anon key:** Không cấp quyền trên dữ liệu nghiệp vụ
- **Auth token:** Dùng ở frontend client

---

## 6. Thiết kế Backend API

### 6.1 Cấu trúc thư mục Backend

```
backend/
├── src/
│   ├── app.ts                    # Express app factory
│   ├── server.ts                 # Server entry point
│   ├── config/
│   │   ├── env.ts                # Environment variables
│   │   └── supabase.ts           # Supabase client config
│   ├── middleware/
│   │   ├── auth.ts               # JWT validation
│   │   ├── errorHandler.ts       # Error handling
│   │   └── logging.ts            # Request logging
│   ├── routes/
│   │   ├── auth.ts               # Authentication routes
│   │   ├── students.ts           # Student routes
│   │   ├── attendance.ts         # Attendance routes
│   │   ├── hardware.ts           # Hardware scan routes
│   │   ├── grades.ts             # Grades routes
│   │   └── timetables.ts         # Timetables routes
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── studentController.ts
│   │   ├── attendanceController.ts
│   │   ├── hardwareController.ts
│   │   └── ...
│   ├── services/
│   │   ├── studentService.ts     # Business logic
│   │   ├── attendanceService.ts
│   │   ├── notificationService.ts # FCM
│   │   ├── dedupeService.ts       # Spam check
│   │   └── ...
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── errorHandler.ts
│   │   └── helpers.ts
│   └── types/
│       ├── index.ts              # TypeScript types
│       └── database.ts           # Generated Supabase types
├── test/
│   └── *.test.ts                 # Unit & integration tests
├── migrations/                   # Supabase migrations (SQL)
├── tsconfig.json
└── package.json
```

### 6.2 Endpoint API chính

| Nhóm | Endpoint | Phương thức | Mô tả |
|------|----------|-----------|-------|
| Auth | `/api/v1/auth/login` | POST | Đăng nhập |
| Students | `GET /api/v1/students` | GET | Danh sách HS |
| | `POST /api/v1/students` | POST | Thêm mới HS |
| Attendance | `POST /api/v1/hardware/scan` | POST | Nhận dữ liệu scan |
| | `GET /api/v1/attendance` | GET | Lịch sử điểm danh |
| Timetables | `GET /api/v1/timetables` | GET | Lấy TKB |
| Grades | `GET /api/v1/grades` | GET | Lấy điểm |
| Fees | `GET /api/v1/fees` | GET | Lấy học phí |
| Announcements | `GET /api/v1/announcements` | GET | Danh sách TB |
| | `POST /api/v1/announcements` | POST | Tạo TB |
| Health | `GET /health` | GET | Kiểm tra sức khỏe |

---

## 7. Thiết kế Frontend

### 7.1 Web Admin (React/TypeScript)

**Cấu trúc:**
```
admin_web/
├── src/
│   ├── components/
│   │   ├── StudentCard.tsx       # Component học sinh
│   │   ├── AttendanceChart.tsx   # Biểu đồ điểm danh
│   │   └── ...
│   ├── features/
│   │   ├── students/             # Quản lý học sinh
│   │   ├── attendance/           # Xem điểm danh
│   │   ├── timetables/           # Lịch học
│   │   ├── grades/               # Điểm số
│   │   └── fees/                 # Học phí
│   ├── services/
│   │   ├── api.ts                # HTTP client
│   │   └── supabase.ts           # Supabase client
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useStudents.ts
│   │   └── ...
│   └── pages/
│       ├── Dashboard.tsx
│       ├── LoginPage.tsx
│       └── ...
```

**Tính năng chính:**
- Dashboard thống kê
- Quản lý danh sách học sinh
- Xem lịch sử điểm danh
- Nhập điểm số
- Quản lý học phí
- Gửi thông báo

### 7.2 Parent App (Flutter)

**Cấu trúc:**
```
attendance_app/lib/
├── features/
│   ├── auth/                     # Đăng nhập
│   ├── home/                     # Dashboard
│   ├── attendance/               # Lịch sử điểm danh
│   ├── timetables/               # Lịch học
│   ├── grades/                   # Điểm số
│   └── messages/                 # Tin nhắn
├── services/
│   ├── api_service.dart
│   ├── supabase_service.dart
│   └── fcm_service.dart
├── models/
│   ├── user.dart
│   ├── student.dart
│   ├── attendance.dart
│   └── ...
└── widgets/
    ├── attendance_card.dart
    ├── grade_card.dart
    └── ...
```

**Tính năng chính:**
- Đăng nhập với email/mật khẩu
- Xem lịch sử điểm danh realtime
- Thông báo push khi học sinh vào/ra
- Xem lịch học, điểm số, học phí
- Nhắn tin với nhà trường

---

## 8. Xử lý lỗi và Exception

### 8.1 Error Code Mapping

| Code | HTTP | Mô tả | Hành động |
|------|------|-------|---------|
| UNAUTHORIZED | 401 | Token không hợp lệ/hết hạn | Yêu cầu đăng nhập lại |
| FORBIDDEN | 403 | Không có quyền | Hiển thị lỗi quyền |
| NOT_FOUND | 404 | Không tìm thấy tài nguyên | Hiển thị 404 |
| DUPLICATE_SCAN | 429 | Quét trùng trong 30s | Bỏ qua hoặc log |
| VALIDATION_ERROR | 400 | Input không hợp lệ | Hiển thị chi tiết lỗi |
| DB_ERROR | 500 | Lỗi database | Retry hoặc log |

### 8.2 Retry Strategy

- **Hardware Scan:** Retry tối đa 3 lần, backoff exponential
- **FCM:** Retry tối đa 5 lần, delay 1 giây
- **Database:** Retry tối đa 2 lần, delay 500ms

---

## 9. Monitoring và Logging

### 9.1 Health Check Endpoint

```
GET /health
Response:
{
  "status": "ok",
  "timestamp": "2026-05-21T10:00:00Z",
  "uptime": 3600,
  "database": "connected",
  "supabase": "up",
  "queue": "enabled"
}
```

### 9.2 Logging Levels

| Level | Mô tả | Ví dụ |
|-------|-------|-------|
| ERROR | Lỗi quan trọng | Database connection failed |
| WARN | Cảnh báo | API rate limit exceeded |
| INFO | Thông tin chung | User logged in |
| DEBUG | Chi tiết debug | Request body: {...} |

---

## 10. Deployment Architecture

### 10.1 Môi trường

| Môi trường | Máy chủ | Database | Cấu hình |
|-----------|---------|----------|---------|
| Development | localhost:3000 | Supabase dev | Debug=true |
| Staging | cloud.example.com | Supabase staging | Debug=false |
| Production | api.syno.edu.vn | Supabase prod | Debug=false, RLS=strict |

### 10.2 Variables môi trường bắt buộc

```bash
# Supabase
SUPABASE_URL=https://bimepdqcwpsynjimvenn.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DB_URL=postgresql://...

# Firebase
FIREBASE_SERVICE_ACCOUNT_JSON=...
GOOGLE_APPLICATION_CREDENTIALS=...

# Backend
PORT=3000
NODE_ENV=production
JWT_SECRET=...
ENABLE_ATTENDANCE_QUEUE=true
REQUIRE_ATTENDANCE_QUEUE=true

# Hardware
HARDWARE_API_KEY=...
COLLECTOR_REQUIRE_HARDWARE_API_KEY=true
```

---

## 11. Performance & Scalability

### 11.1 Optimization strategies

| Khu vực | Chiến lược | Công cụ |
|--------|-----------|---------|
| Database | Index trên school_id, student_id | PostgreSQL Indexes |
| API | Caching response, pagination | Redis (tùy chọn) |
| Frontend | Code splitting, lazy loading | Webpack, React.lazy |
| Push Notification | Batch FCM requests | Firebase Admin SDK |

### 11.2 Load balancing

- **API:** nginx/HAProxy với multiple backend instances
- **Database:** Supabase managed (auto-scaling)
- **Storage:** CDN cho static assets

---

**Ngày lập:** 21/05/2026
**Người lập:** SYNO Development Team
**Phiên bản:** 1.0