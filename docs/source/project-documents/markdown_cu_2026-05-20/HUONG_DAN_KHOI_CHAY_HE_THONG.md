# Hướng dẫn tải và chạy hệ thống để kiểm thử

Tài liệu này hướng dẫn từ lúc tải source code từ Git đến khi chạy được Backend + Flutter (Web và Desktop) để test đầy đủ tính năng.

## 1) Yêu cầu môi trường

- Windows 10/11
- Git
- Node.js LTS (khuyến nghị 18+)
- PostgreSQL (khuyến nghị 14+)
- Redis (nếu bật hàng đợi điểm danh; có thể tắt queue bằng biến môi trường)
- Flutter SDK (project này dùng local SDK trong thư mục `flutter-sdk`)
- Google Chrome (để chạy Flutter Web)
- Visual Studio Build Tools / Visual Studio 2022 (để chạy Flutter Windows)

## 2) Tải source code

```bash
git clone https://github.com/dotuanlong2004/attendance_app.git
cd attendance_app
```

Sau khi clone, cấu trúc chính:

- `backend/` -> API Node.js + PostgreSQL
- `attendance_app/` -> Flutter app

Lưu ý: repo hiện đang ignore thư mục `flutter-sdk/`, vì vậy sau khi clone bạn cần cài Flutter SDK trên máy hoặc đặt sẵn một bản SDK local rồi chỉnh đường dẫn lệnh cho phù hợp.

## 3) Cấu hình Backend

### 3.1 Tạo file môi trường

Sao chép file mẫu:

```bash
cd backend
copy .env.example .env
```

Mở `.env` và chỉnh các giá trị:

- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `PORT` (mặc định 3000)
- Có thể tắt queue nếu chưa cấu hình Redis: `ENABLE_ATTENDANCE_QUEUE=false`

### 3.2 Cài dependencies và khởi tạo dữ liệu

```bash
npm install
npm run db:setup
npm run db:seed-user
npm run db:seed-attendance
npm run db:seed-timetable
npm run db:gen-link-codes
```

### 3.3 Chạy Backend

```bash
npm start
```

API mặc định: `http://127.0.0.1:3000`

## 4) Chạy Flutter App

Mở terminal mới:

```bash
cd attendance_app
flutter pub get
flutter config --enable-web
```

Nếu bạn dùng SDK local (không thêm vào PATH), thay `flutter` bằng đường dẫn đầy đủ, ví dụ:

```bash
..\flutter-sdk\bin\flutter.bat pub get
..\flutter-sdk\bin\flutter.bat config --enable-web
```

## 5) Chạy để test trên Web

```bash
flutter run -d chrome --dart-define=API_BASE_URL=http://127.0.0.1:3000
```

## 6) Chạy để test trên Windows Desktop

```bash
flutter run -d windows --dart-define=API_BASE_URL=http://127.0.0.1:3000
```

## 7) Tài khoản test nhanh

- Giáo viên:
  - Email: `teacher.admin@school.local`
  - Mật khẩu: `Password@123`
- Phụ huynh mẫu:
  - Email: `teacher1@school.local`
  - Mật khẩu: `Password@123`

## 8) Luồng test khuyến nghị

### 8.1 Đăng nhập và Dashboard

- Đăng nhập bằng tài khoản giáo viên.
- Kiểm tra:
  - Lịch sử điểm danh
  - Thời khóa biểu
  - Màn hình quản lý mã liên kết học sinh

### 8.2 Đăng ký phụ huynh tự phục vụ

- Trên màn hình đăng nhập chọn **Đăng ký tài khoản phụ huynh**.
- Nhập:
  - Họ tên
  - Email/SĐT
  - Mật khẩu
  - Mã liên kết học sinh (ví dụ: `LK-HS001`, `LK-HS002` hoặc mã được giáo viên cấp)
- Sau khi đăng ký thành công hệ thống tự đăng nhập và chuyển vào Dashboard.

### 8.3 Kiểm tra API nhanh (tùy chọn)

- Đăng nhập:
  - `POST /api/v1/auth/login`
- Lấy thời khóa biểu:
  - `GET /api/v1/mobile/timetable`
- Lấy danh sách học sinh + link code (teacher/admin):
  - `GET /api/v1/mobile/students`

## 9) Xử lý lỗi thường gặp

- **Lỗi không kết nối API (`connection refused`)**
  - Kiểm tra backend đã chạy chưa, đúng cổng chưa.
- **Flutter Windows lỗi build/link**
  - Chạy `flutter clean`
  - Chạy lại `pub get` rồi `run -d windows`
- **Không thấy dữ liệu**
  - Chạy lại các lệnh seed ở mục 3.2.
- **Web gọi sai API**
  - Đảm bảo có `--dart-define=API_BASE_URL=http://127.0.0.1:3000`.

## 10) Kiểm tra chất lượng mã trước khi bàn giao

Trong `attendance_app/`:

```bash
flutter analyze
```

Trong `backend/`:

```bash
npm run db:setup
```

---

Nếu cần chạy cho nhiều người test cùng lúc trong mạng LAN, có thể đổi `API_BASE_URL` sang IP nội bộ của máy chạy backend (ví dụ `http://192.168.x.x:3000`).

## 11) Link demo tạm thời (public)

Trong phiên làm việc hiện tại đã mở demo public bằng tunnel:

- Frontend Web: `https://wide-cups-fry.loca.lt`
- Backend API: `https://tough-bats-grab.loca.lt`

Lưu ý:

- Đây là link tạm thời, sẽ đổi hoặc ngắt khi tắt terminal/tunnel.
- Nếu link hết hạn, chạy lại các bước tunnel ở mục 5 và 6 để tạo link mới.