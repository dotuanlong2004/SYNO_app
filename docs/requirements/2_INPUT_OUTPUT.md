# TÀI LIỆU ĐẶC TẢ INPUT / OUTPUT
## Dự án SYNO - Nền tảng Quản lý Trường học Thông minh

---

## 1. Giới thiệu

Tài liệu này mô tả chi tiết các dữ liệu đầu vào (Input) và đầu ra (Output) của từng API, luồng nghiệp vụ trong hệ thống SYNO. Mỗi endpoint/luồng bao gồm: cấu trúc dữ liệu, kiểu dữ liệu, ràng buộc hợp lệ và ví dụ cụ thể.

---

## 2. Quy ước chung

### 2.1 Format phản hồi API
```json
// Thành công
{
  "success": true,
  "data": { ... },
  "message": "OK"
}

// Lỗi
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Bạn không có quyền thực hiện thao tác này"
  }
}
```

### 2.2 Xác thực
- Mọi endpoint (trừ đăng nhập) đều yêu cầu header: `Authorization: Bearer <jwt_token>`
- Token hết hạn sau 7 ngày

### 2.3 Kiểu dữ liệu
| Ký hiệu | Ý nghĩa |
|---------|---------|
| string | Chuỗi ký tự |
| number | Số nguyên |
| decimal | Số thập phân |
| boolean | True/False |
| datetime | ISO 8601 (VD: 2026-05-21T08:00:00+07:00) |
| uuid | Mã định danh duy nhất |
| nullable | Có thể null |

---

## 3. Xác thực (Authentication)

### 3.1 Đăng nhập

**Endpoint:** `POST /api/v1/auth/login`

#### Input
| Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả |
|--------|------|----------|-----------|-------|
| email | string | Có | email hợp lệ | Email đăng nhập |
| password | string | Có | độ dài 6-100 ký tự | Mật khẩu |

**Ví dụ Input:**
```json
{
  "email": "teacher1@school.edu",
  "password": "password123"
}
```

#### Output
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| access_token | string | JWT token |
| user.id | uuid | ID người dùng |
| user.email | string | Email |
| user.role | string | Vai trò (admin, teacher, parent) |
| user.school_id | string | ID trường học |
| user.full_name | string | Họ tên |

**Ví dụ Output:**
```json
{
  "success": true,
  "data": {
    "access_token": "<jwt-access-token>",
    "user": {
      "id": "uuid-123",
      "email": "teacher1@school.edu",
      "role": "admin",
      "school_id": "1",
      "full_name": "Nguyễn Văn A"
    }
  }
}
```

---

## 4. Quản lý học sinh

### 4.1 Lấy danh sách học sinh

**Endpoint:** `GET /api/v1/students`

#### Input (Query Parameters)
| Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả |
|--------|------|----------|-----------|-------|
| class_id | string | Không | | Lọc theo lớp |
| search | string | Không | tối đa 100 ký tự | Tìm kiếm theo tên/mã HS |
| page | number | Không | mặc định 1 | Trang hiện tại |
| limit | number | Không | mặc định 20, tối đa 100 | Số bản ghi mỗi trang |

#### Output
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| data | array | Danh sách học sinh |
| data[].id | number | ID học sinh |
| data[].student_code | string | Mã học sinh |
| data[].full_name | string | Họ tên |
| data[].class_name | string | Tên lớp |
| data[].parent_name | string | Tên phụ huynh |
| data[].parent_phone | string | Số điện thoại phụ huynh |
| total | number | Tổng số bản ghi |
| page | number | Trang hiện tại |

**Ví dụ Output:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "student_code": "HS0085",
        "full_name": "Nguyễn Thị Lan",
        "class_name": "6A1",
        "parent_name": "Nguyễn Văn A",
        "parent_phone": "0901234567"
      }
    ],
    "total": 150,
    "page": 1
  }
}
```

### 4.2 Thêm mới học sinh

**Endpoint:** `POST /api/v1/students`

#### Input
| Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả |
|--------|------|----------|-----------|-------|
| student_code | string | Có | duy nhất trong trường | Mã học sinh |
| full_name | string | Có | 2-100 ký tự | Họ tên |
| date_of_birth | string | Không | định dạng YYYY-MM-DD | Ngày sinh |
| class_id | number | Có | tồn tại trong DB | ID lớp học |
| parent_id | uuid | Không | tồn tại trong user_profiles | ID phụ huynh |
| ma_cham_cong | number | Không | duy nhất trong trường | Mã chấm công thiết bị |

**Ví dụ Input:**
```json
{
  "student_code": "HS0086",
  "full_name": "Trần Minh Khoa",
  "date_of_birth": "2013-05-15",
  "class_id": 5,
  "parent_id": "uuid-456",
  "ma_cham_cong": 2
}
```

#### Output
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| id | number | ID học sinh mới |
| student_code | string | Mã học sinh |
| full_name | string | Họ tên |
| created_at | datetime | Thời gian tạo |

---

## 5. Quản lý điểm danh

### 5.1 Nhận dữ liệu điểm danh từ thiết bị

**Endpoint:** `POST /api/v1/hardware/scan`

#### Input
| Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả |
|--------|------|----------|-----------|-------|
| ma_cham_cong | number | Có | tồn tại trong DB | Mã chấm công thiết bị |
| scanned_at | datetime | Có | không trong tương lai | Thời gian quét |
| device_serial | string | Không | | Serial thiết bị |
| school_id | string | Không | mặc định "1" | ID trường |

**Header bắt buộc:** `X-Hardware-Api-Key: <api_key>`

**Ví dụ Input:**
```json
{
  "ma_cham_cong": 1,
  "scanned_at": "2026-05-21T08:05:32+07:00",
  "device_serial": "AYTD01032550",
  "school_id": "1"
}
```

#### Output
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| attendance_id | number | ID bản ghi điểm danh |
| student_code | string | Mã học sinh |
| student_name | string | Họ tên học sinh |
| scanned_at | datetime | Thời gian điểm danh |
| log_type | string | Loại (check_in / check_out) |
| notification_sent | boolean | Đã gửi thông báo chưa |

**Ví dụ Output:**
```json
{
  "success": true,
  "data": {
    "attendance_id": 1042,
    "student_code": "HS0085",
    "student_name": "Nguyễn Thị Lan",
    "scanned_at": "2026-05-21T08:05:32+07:00",
    "log_type": "check_in",
    "notification_sent": true
  }
}
```

**Lỗi có thể xảy ra:**
| HTTP Code | Mã lỗi | Mô tả |
|-----------|--------|-------|
| 401 | INVALID_API_KEY | API key không hợp lệ |
| 404 | STUDENT_NOT_FOUND | Không tìm thấy học sinh |
| 429 | DUPLICATE_SCAN | Quét trùng trong 30 giây |
| 500 | DB_ERROR | Lỗi cơ sở dữ liệu |

### 5.2 Xem lịch sử điểm danh

**Endpoint:** `GET /api/v1/attendance`

#### Input (Query Parameters)
| Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả |
|--------|------|----------|-----------|-------|
| student_id | number | Không | | Lọc theo học sinh |
| student_code | string | Không | | Lọc theo mã học sinh |
| from_date | string | Không | YYYY-MM-DD | Ngày bắt đầu |
| to_date | string | Không | YYYY-MM-DD | Ngày kết thúc |
| page | number | Không | mặc định 1 | Trang |
| limit | number | Không | mặc định 20 | Số bản ghi |

#### Output
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| data[].id | number | ID bản ghi |
| data[].student_code | string | Mã học sinh |
| data[].student_name | string | Họ tên |
| data[].scanned_at | datetime | Thời gian quét |
| data[].log_type | string | check_in hoặc check_out |
| data[].device_serial | string | Serial thiết bị |

---

## 6. Thời khóa biểu

### 6.1 Lấy thời khóa biểu

**Endpoint:** `GET /api/v1/timetables`

#### Input (Query Parameters)
| Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả |
|--------|------|----------|-----------|-------|
| class_id | number | Không | | Lọc theo lớp |
| student_id | number | Không | | Lọc theo học sinh |
| week_start | string | Không | YYYY-MM-DD | Ngày đầu tuần |

#### Output
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| data[].id | number | ID buổi học |
| data[].class_name | string | Tên lớp |
| data[].subject_name | string | Tên môn học |
| data[].day_of_week | number | Thứ (2-7) |
| data[].period | number | Tiết học |
| data[].start_time | string | HH:mm |
| data[].end_time | string | HH:mm |
| data[].teacher_name | string | Tên giáo viên |
| data[].room | string | Phòng học |

**Ví dụ Output:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "class_name": "6A1",
      "subject_name": "Toán",
      "day_of_week": 2,
      "period": 1,
      "start_time": "07:30",
      "end_time": "08:15",
      "teacher_name": "Trần Thị B",
      "room": "P101"
    }
  ]
}
```

---

## 7. Điểm số

### 7.1 Lấy điểm số học sinh

**Endpoint:** `GET /api/v1/grades`

#### Input (Query Parameters)
| Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả |
|--------|------|----------|-----------|-------|
| student_id | number | Không | | ID học sinh |
| student_code | string | Không | | Mã học sinh |
| semester | string | Không | "HK1" hoặc "HK2" | Học kỳ |
| school_year | string | Không | VD: "2025-2026" | Năm học |

#### Output
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| data[].subject_name | string | Tên môn |
| data[].score_type | string | Loại điểm (thuong_xuyen, giua_ky, cuoi_ky) |
| data[].score | decimal | Điểm số (0 - 10) |
| data[].semester | string | Học kỳ |
| data[].average_score | decimal | Điểm trung bình môn |
| data[].rank | string | Xếp loại (Giỏi, Khá, TB, Yếu) |

---

## 8. Học phí

### 8.1 Lấy học phí học sinh

**Endpoint:** `GET /api/v1/fees`

#### Input (Query Parameters)
| Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả |
|--------|------|----------|-----------|-------|
| student_id | number | Không | | ID học sinh |
| payment_status | string | Không | paid/unpaid/partial | Trạng thái |
| school_year | string | Không | | Năm học |

#### Output
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| data[].id | number | ID khoản thu |
| data[].fee_name | string | Tên khoản thu |
| data[].total_amount | decimal | Số tiền (VNĐ) |
| data[].paid_amount | decimal | Đã thanh toán (VNĐ) |
| data[].remaining_amount | decimal | Còn lại (VNĐ) |
| data[].payment_status | string | paid/unpaid/partial |
| data[].due_date | string | Hạn nộp (YYYY-MM-DD) |

**Ví dụ Output:**
```json
{
  "success": true,
  "data": [
    {
      "id": 50,
      "fee_name": "Học phí tháng 5/2026",
      "total_amount": 1500000,
      "paid_amount": 0,
      "remaining_amount": 1500000,
      "payment_status": "unpaid",
      "due_date": "2026-05-31"
    }
  ]
}
```

---

## 9. Thông báo

### 9.1 Lấy danh sách thông báo

**Endpoint:** `GET /api/v1/announcements`

#### Input (Query Parameters)
| Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả |
|--------|------|----------|-----------|-------|
| priority | string | Không | normal/high/urgent | Mức độ ưu tiên |
| page | number | Không | mặc định 1 | Trang |
| limit | number | Không | mặc định 20 | Số bản ghi |

#### Output
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| data[].id | number | ID thông báo |
| data[].title | string | Tiêu đề |
| data[].content | string | Nội dung |
| data[].priority | string | Mức độ ưu tiên |
| data[].created_at | datetime | Thời gian tạo |
| data[].is_read | boolean | Đã đọc chưa |

### 9.2 Tạo thông báo

**Endpoint:** `POST /api/v1/announcements`

#### Input
| Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả |
|--------|------|----------|-----------|-------|
| title | string | Có | 5-200 ký tự | Tiêu đề |
| content | string | Có | 10-5000 ký tự | Nội dung |
| priority | string | Không | mặc định "normal" | Mức độ: normal/high/urgent |
| target_classes | array | Không | | Danh sách lớp nhận |
| send_notification | boolean | Không | mặc định true | Gửi push notification |

---

## 10. Luồng điểm danh End-to-End

### 10.1 Mô tả luồng
```
[Học sinh quét thẻ/vân tay]
       ↓
[Thiết bị AI-X1 ghi nhận]
       ↓ (TCP/IP polling 3s)
[AI-X1 Collector (C# .NET)]
       ↓ POST /api/v1/hardware/scan
[Backend Node.js]
       ↓ Kiểm tra spam (30s debounce)
       ↓ Tra cứu học sinh theo ma_cham_cong + school_id
       ↓ INSERT vào attendance_logs
[Supabase PostgreSQL]
       ↓ Lấy FCM token phụ huynh
[Backend gửi FCM]
       ↓
[Firebase Cloud Messaging]
       ↓ Push notification
[Ứng dụng phụ huynh (Flutter)]
```

### 10.2 Dữ liệu tại mỗi bước

| Bước | Dữ liệu truyền đi | Dạng |
|------|------------------|------|
| AI-X1 → Backend | ma_cham_cong, scanned_at, device_serial | JSON/HTTP |
| Backend → DB | student_id, school_id, scanned_at, log_type | SQL INSERT |
| Backend → FCM | fcm_token, title, body, student_info | JSON |
| FCM → App | notification title, body, data payload | Push |
| App hiển thị | Tên học sinh, giờ vào, ảnh | UI Card |

---

## 11. Push Notification Payload (FCM)

### 11.1 Cấu trúc payload
```json
{
  "token": "device_fcm_token_here",
  "notification": {
    "title": "Điểm danh học sinh",
    "body": "Nguyễn Thị Lan đã vào trường lúc 08:05"
  },
  "data": {
    "type": "attendance",
    "student_code": "HS0085",
    "student_name": "Nguyễn Thị Lan",
    "scanned_at": "2026-05-21T08:05:32+07:00",
    "log_type": "check_in",
    "school_id": "1"
  }
}
```

### 11.2 Các loại notification
| Loại | Tiêu đề | Nội dung mẫu |
|------|---------|--------------|
| check_in | Điểm danh vào trường | "{Tên HS} đã vào trường lúc {giờ}" |
| check_out | Điểm danh ra về | "{Tên HS} đã ra về lúc {giờ}" |
| announcement | Thông báo từ trường | "{Tiêu đề thông báo}" |
| fee_reminder | Nhắc học phí | "Học phí tháng {tháng} đến hạn {ngày}" |

---

**Ngày lập:** 21/05/2026
**Người lập:** SYNO Development Team
**Phiên bản:** 1.0
