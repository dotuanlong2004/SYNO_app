# Tài liệu đặc tả và chuẩn hoá dự án SYNO

## 1. Tổng quan dự án
**Tên hệ thống:** SYNO
**Loại:** Nền tảng SaaS quản lý trường học thông minh
**Tầm nhìn:** Xây dựng hệ sinh thái kết nối thời gian thực giữa trường học và phụ huynh, cung cấp điểm danh tự động, theo dõi học tập và giao tiếp.
**Đối tượng sử dụng:**
- **Quản trị trường:** Quản lý học sinh, phụ huynh, lịch học và học phí qua Web Admin.
- **Phụ huynh:** Theo dõi điểm danh, kết quả học tập và lịch học của con qua ứng dụng di động.
- **Quản trị kỹ thuật:** Quản lý sức khỏe hệ thống, kết nối SDK và các tenant SaaS.

---

## 2. Kiến trúc kỹ thuật

### 2.1 Công nghệ sử dụng
- **Ứng dụng di động:** Flutter (Android & iOS)
- **Web Admin:** ReactJS / TypeScript
- **Backend:** Node.js / Express
- **Cơ sở dữ liệu & Xác thực:** Supabase (PostgreSQL)
- **Thông báo realtime:** Firebase Cloud Messaging (FCM)
- **Tích hợp phần cứng:** Ronald Jack AI-X1 SDK (.NET/C#)

### 2.2 Thành phần hệ thống
- **Web Admin:** Bảng điều khiển dựa trên tab để quản lý trường tập trung.
- **Ứng dụng phụ huynh:** Ứng dụng tập trung vào người dùng để theo dõi thời gian thực.
- **Cổng điểm danh:** Dịch vụ riêng kết nối phần cứng AI-X1 với cơ sở dữ liệu Supabase.
- **Lớp SaaS:** Kiến trúc đa tenant sử dụng `school_id` để cô lập dữ liệu.

---

## 3. Đặc tả cơ sở dữ liệu (Supabase)

### 3.1 Nguyên tắc đa tenant
Mọi bảng nghiệp vụ **PHẢI** có cột `school_id`. Mọi truy vấn phải lọc theo `school_id` của người dùng hiện tại để tránh rò rỉ dữ liệu giữa các tenant.

### 3.2 Sơ đồ cốt lõi
| Bảng | Khoá chính | Các cột quan trọng | Mục đích |
| :--- | :--- | :--- | :--- |
| `schools` | `id` (varchar) | `name`, `status`, `education_levels` | Thông tin tenant |
| `students` | `id` (bigint) | `school_id`, `student_code`, `full_name`, `parent_id` | Hồ sơ học sinh |
| `user_profiles` | `id` (uuid) | `school_id`, `role`, `fcm_token`, `student_code` | Vai trò người dùng & mã thông báo thiết bị |
| `attendance_logs` | `id` (bigint) | `school_id`, `student_id`, `scanned_at`, `log_type` | Lịch sử điểm danh |
| `timetables` | `id` (bigint) | `school_id`, `class_id`, `subject_name`, `start_time` | Lịch học |
| `student_fees` | `id` (bigint) | `school_id`, `student_id`, `total_amount`, `payment_status` | Theo dõi học phí |
| `grades` | `id` (bigint) | `school_id`, `student_id`, `subject_name`, `average_score` | Bản ghi học tập |
| `announcements` | `id` (bigint) | `school_id`, `title`, `content`, `priority` | Thông báo trường học |
| `chat_messages` | `id` (bigint) | `school_id`, `student_id`, `sender_id`, `message_text` | Nhật ký giao tiếp |
| `hardware_scan_debounce` | `id` (bigint) | `school_id`, `student_code`, `expires_at` | Ngăn quét trùng lặp |

### 3.3 Chuẩn bảo mật (SSR)
- **Bật RLS:** Phải bật Bảo mật mức hàng (Row Level Security) trên tất cả các bảng nghiệp vụ.
- **Cấp quyền:** Phải cấp `GRANT` rõ ràng cho `authenticated` và `service_role`. Vai trò `anon` **KHÔNG ĐƯỢC** cấp quyền trên dữ liệu nghiệp vụ.
- **Chính sách:** Các chính sách phải được giới hạn theo `school_id` bằng cách sử dụng `auth.uid()` ánh xạ qua bảng `user_profiles`.

---

## 4. Luồng sự kiện realtime
**Đường đi:** `Quét phần cứng` → `Dịch vụ SDK` → `Lớp chống trùng lặp` → `Supabase (attendance_logs)` → `Dịch vụ thông báo` → `FCM` → `Ứng dụng phụ huynh`.

---

## 5. Tiêu chuẩn kỹ thuật

### 5.1 Quy tắc đặt tên
- **Cơ sở dữ liệu:** `snake_case` (ví dụ: `student_code`)
- **Tập tin Flutter:** `snake_case` (ví dụ: `student_card.dart`)
- **Lớp Flutter/React:** `PascalCase` (ví dụ: `StudentCard`)
- **Hooks/Hàm:** `camelCase` (ví dụ: `useStudents`)
- **Hằng số:** `UPPER_SNAKE_CASE` (ví dụ: `MAX_RETRY_COUNT`)

### 5.2 Cấu trúc thư mục
- **Web Admin:** `src/core`, `src/shared`, `src/services`, `src/features`, `src/components`
- **Ứng dụng Flutter:** `lib/core`, `lib/shared`, `lib/features`, `lib/services`, `lib/widgets`
- **Supabase:** `supabase/migrations`, `supabase/functions`, `supabase/policies`

### 5.3 Hợp đồng API
- **Thành công:** `{"success": true, "data": {...}, "message": "OK"}`
- **Lỗi:** `{"success": false, "error": {"code": "...", "message": "..."}}`

---

## 6. Lộ trình triển khai
- **Giai đoạn 1:** Xây dựng nền tảng (SDK, Web/App cơ bản) - **Hoàn thành**
- **Giai đoạn 2:** Chuẩn hoá & mở rộng (TypeScript, FCM, TKB, Điểm số, Học phí) - **Đang thực hiện**
- **Giai đoạn 3:** Củng cố bảo mật & kiểm thử đa thiết bị.
- **Giai đoạn 4:** Phát hành sản phẩm & Bảo trì.