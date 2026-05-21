# TÀI LIỆU MÔ TẢ YÊU CẦU
## Dự án SYNO - Nền tảng Quản lý Trường học Thông minh

---

## 1. Giới thiệu tổng quan

### 1.1 Mục đích tài liệu
Tài liệu này trình bày toàn bộ yêu cầu chức năng và phi chức năng của hệ thống SYNO - Nền tảng SaaS quản lý trường học thông minh. Tài liệu dùng làm cơ sở cho việc phát triển, kiểm thử và nghiệm thu phần mềm.

### 1.2 Phạm vi dự án
SYNO là hệ thống quản lý trường học kết nối thời gian thực giữa nhà trường và phụ huynh, bao gồm:
- Điểm danh tự động qua thiết bị Ronald Jack AI-X1
- Theo dõi học tập (điểm số, lịch học)
- Quản lý học phí
- Giao tiếp và thông báo
- Ứng dụng di động cho phụ huynh
- Web Admin cho quản trị trường

### 1.3 Đối tượng sử dụng
| STT | Đối tượng | Mô tả |
|-----|-----------|-------|
| 1 | Quản trị trường | Quản lý học sinh, phụ huynh, lịch học, học phí qua Web Admin |
| 2 | Phụ huynh | Theo dõi điểm danh, kết quả học tập, lịch học của con qua ứng dụng di động |
| 3 | Quản trị kỹ thuật | Quản lý hệ thống, kết nối thiết bị, các tenant SaaS |

---

## 2. Yêu cầu chức năng

### 2.1 Quản lý người dùng và xác thực

#### 2.1.1 Đăng nhập hệ thống
- **Mô tả:** Cho phép người dùng đăng nhập vào hệ thống
- **Người dùng:** Quản trị trường, Phụ huynh
- **Đầu vào:** Email/Số điện thoại, Mật khẩu
- **Đầu ra:** Token xác thực, Thông tin người dùng, Vai trò
- **Ưu tiên:** Cao

#### 2.1.2 Quản lý hồ sơ người dùng
- **Mô tả:** Tạo, cập nhật, xóa hồ sơ người dùng
- **Người dùng:** Quản trị trường
- **Đầu vào:** Thông tin người dùng (tên, email, số điện thoại, vai trò)
- **Đầu ra:** Xác nhận thao tác, Thông tin người dùng đã cập nhật
- **Ưu tiên:** Cao

### 2.2 Quản lý học sinh

#### 2.2.1 Thêm mới học sinh
- **Mô tả:** Thêm thông tin học sinh vào hệ thống
- **Người dùng:** Quản trị trường
- **Đầu vào:** Mã học sinh, Họ tên, Ngày sinh, Lớp, Thông tin phụ huynh
- **Đầu ra:** Xác nhận thêm mới, Mã học sinh mới
- **Ưu tiên:** Cao

#### 2.2.2 Danh sách học sinh
- **Mô tả:** Hiển thị danh sách học sinh theo lớp/trường
- **Người dùng:** Quản trị trường
- **Đầu vào:** Bộ lọc (lớp, trường)
- **Đầu ra:** Danh sách học sinh (mã, tên, lớp, trạng thái)
- **Ưu tiên:** Cao

#### 2.2.3 Cập nhật thông tin học sinh
- **Mô tả:** Cập nhật thông tin học sinh
- **Người dùng:** Quản trị trường
- **Đầu vào:** Mã học sinh, Thông tin cần cập nhật
- **Đầu ra:** Xác nhận cập nhật
- **Ưu tiên:** Trung bình

### 2.3 Quản lý điểm danh

#### 2.3.1 Điểm danh tự động qua thiết bị AI-X1
- **Mô tả:** Nhận dữ liệu điểm danh từ thiết bị Ronald Jack AI-X1
- **Người dùng:** Hệ thống (tự động)
- **Đầu vào:** Dữ liệu quét từ thiết bị (mã chấm công, thời gian)
- **Đầu ra:** Bản ghi điểm danh trong database
- **Ưu tiên:** Rất cao

#### 2.3.2 Xem lịch sử điểm danh
- **Mô tả:** Xem lịch sử điểm danh của học sinh
- **Người dùng:** Quản trị trường, Phụ huynh
- **Đầu vào:** Mã học sinh, Khoảng thời gian
- **Đầu ra:** Danh sách bản ghi điểm danh
- **Ưu tiên:** Cao

#### 2.3.3 Thông báo điểm danh realtime
- **Mô tả:** Gửi thông báo đến phụ huynh khi có điểm danh mới
- **Người dùng:** Hệ thống (tự động)
- **Đầu vào:** Bản ghi điểm danh mới
- **Đầu ra:** Push notification đến thiết bị phụ huynh
- **Ưu tiên:** Rất cao

### 2.4 Quản lý thời khóa biểu

#### 2.4.1 Tạo thời khóa biểu
- **Mô tả:** Tạo thời khóa biểu cho các lớp
- **Người dùng:** Quản trị trường
- **Đầu vào:** Thông tin buổi học (lớp, môn, thứ, tiết, giáo viên, phòng)
- **Đầu ra:** Xác nhận tạo TKB
- **Ưu tiên:** Cao

#### 2.4.2 Xem thời khóa biểu
- **Mô tả:** Hiển thị TKB theo lớp hoặc giáo viên
- **Người dùng:** Quản trị trường, Phụ huynh
- **Đầu vào:** Lớp hoặc Giáo viên
- **Đầu ra:** Danh sách các buổi học trong tuần
- **Ưu tiên:** Cao

### 2.5 Quản lý điểm số

#### 2.5.1 Nhập điểm số
- **Mô tả:** Nhập điểm số học sinh
- **Người dùng:** Quản trị trường
- **Đầu vào:** Mã học sinh, Môn học, Điểm số, Loại điểm
- **Đầu ra:** Xác nhận lưu điểm
- **Ưu tiên:** Cao

#### 2.5.2 Xem điểm số
- **Mô tả:** Hiển thị điểm số học sinh
- **Người dùng:** Quản trị trường, Phụ huynh
- **Đầu vào:** Mã học sinh, Học kỳ
- **Đầu ra:** Bảng điểm chi tiết
- **Ưu tiên:** Cao

### 2.6 Quản lý học phí

#### 2.6.1 Tạo học phí
- **Mô tả:** Tạo khoản học phí cho học sinh
- **Người dùng:** Quản trị trường
- **Đầu vào:** Mã học sinh, Số tiền, Hạn nộp, Nội dung
- **Đầu ra:** Xác nhận tạo học phí
- **Ưu tiên:** Cao

#### 2.6.2 Theo dõi thanh toán
- **Mô tả:** Theo dõi trạng thái thanh toán học phí
- **Người dùng:** Quản trị trường, Phụ huynh
- **Đầu vào:** Mã học sinh hoặc Lớp
- **Đầu ra:** Danh sách học phí và trạng thái
- **Ưu tiên:** Cao

### 2.7 Quản lý thông báo

#### 2.7.1 Gửi thông báo
- **Mô tả:** Gửi thông báo đến phụ huynh/học sinh
- **Người dùng:** Quản trị trường
- **Đầu vào:** Tiêu đề, Nội dung, Đối tượng nhận, Mức độ ưu tiên
- **Đầu ra:** Xác nhận gửi thông báo
- **Ưu tiên:** Trung bình

#### 2.7.2 Xem thông báo
- **Mô tả:** Hiển thị danh sách thông báo
- **Người dùng:** Phụ huynh
- **Đầu vào:** (Không có - mặc định hiển thị thông báo của con)
- **Đầu ra:** Danh sách thông báo
- **Ưu tiên:** Cao

### 2.8 Quản lý tin nhắn

#### 2.8.1 Gửi tin nhắn
- **Mô tả:** Cho phép giao tiếp giữa nhà trường và phụ huynh
- **Người dùng:** Quản trị trường, Phụ huynh
- **Đầu vào:** Người nhận, Nội dung tin nhắn
- **Đầu ra:** Xác nhận gửi tin nhắn
- **Ưu tiên:** Trung bình

---

## 3. Yêu cầu phi chức năng

### 3.1 Hiệu năng

| STT | Tiêu chí | Yêu cầu |
|-----|----------|---------|
| 1 | Thời gian phản hồi API | < 500ms cho 95% truy vấn |
| 2 | Thời gian xử lý điểm danh | < 2 giây từ khi quét đến khi lưu |
| 3 | Số lượng người dùng đồng thời | Hỗ trợ 1000+ người dùng |
| 4 | Dung lượng lưu trữ | Cho phép mở rộng theo nhu cầu |

### 3.2 Bảo mật

| STT | Tiêu chí | Yêu cầu |
|-----|----------|---------|
| 1 | Xác thực | Sử dụng JWT token |
| 2 | Mã hóa | Mã hóa dữ liệu nhạy cảm |
| 3 | Phân quyền | Kiểm soát truy cập theo vai trò (RBAC) |
| 4 | Đa tenant | Cô lập dữ liệu theo school_id |
| 5 | RLS | Bật Row Level Security trên PostgreSQL |

### 3.3 Độ tin cậy

| STT | Tiêu chí | Yêu cầu |
|-----|----------|---------|
| 1 | Uptime | 99.5% thời gian hoạt động |
| 2 | Sao lưu | Sao lưu tự động hàng ngày |
| 3 | Khôi phục | Khôi phục dữ liệu trong 24 giờ |

### 3.4 Khả năng sử dụng

| STT | Tiêu chí | Yêu cầu |
|-----|----------|---------|
| 1 | Giao diện | Thân thiện, dễ sử dụng |
| 2 | Đa nền tảng | Hỗ trợ Android, iOS, Web |
| 3 | Đa ngôn ngữ | Tiếng Việt (ưu tiên) |

### 3.5 Khả năng bảo trì

| STT | Tiêu chí | Yêu cầu |
|-----|----------|---------|
| 1 | Code chuẩn | Tuân thủ coding standards |
| 2 | Tài liệu | Đầy đủ tài liệu API và hướng dẫn |
| 3 | Kiểm thử | Có unit test và integration test |

---

## 4. Yêu cầu tích hợp

### 4.1 Thiết bị điểm danh
- **Thiết bị:** Ronald Jack AI-X1
- **Giao thức:** TCP/IP
- **Cổng:** 4370
- **Địa chỉ IP:** Cấu hình được (mặc định 192.168.0.225)

### 4.2 Firebase Cloud Messaging
- **Mục đích:** Gửi push notification
- **Loại thiết bị:** Android, iOS

### 4.3 Supabase
- **Cơ sở dữ liệu:** PostgreSQL
- **Xác thực:** Supabase Auth
- **Realtime:** Supabase Realtime

---

## 5. Các giả định và ràng buộc

### 5.1 Giả định
- Hệ thống hoạt động trong môi trường có kết nối Internet ổn định
- Thiết bị AI-X1 được lắp đặt tại cổng trường
- Phụ huynh có smartphone Android hoặc iOS

### 5.2 Ràng buộc
- Sử dụng kiến trúc SaaS đa tenant
- Dữ liệu phải được cách ly theo school_id
- Không sử dụng service_role key ở frontend

---

## 6. Phụ lục

### 6.1 Thuật ngữ
| Thuật ngữ | Mô tả |
|-----------|-------|
| SaaS | Software as a Service - Phần mềm dịch vụ |
| RLS | Row Level Security - Bảo mật mức hàng |
| FCM | Firebase Cloud Messaging |
| AI-X1 | Thiết bị điểm danh Ronald Jack |
| TKB | Thời khóa biểu |
| school_id | ID trường học (đa tenant) |

### 6.2 Tài liệu tham khảo
- PROJECT_SPECIFICATION.md - Đặc tả kỹ thuật
- CURRENT_STATUS.md - Trạng thái hiện tại
- ROADMAP.md - Lộ trình phát triển

---

**Ngày lập:** 21/05/2026
**Người lập:** SYNO Development Team
**Phiên bản:** 1.0