# Báo cáo: Đổi tên attendance_app thành Syno_App

## 1. Tình trạng hiện tại

### 1.1. Lỗi khi đổi tên thư mục
**Lỗi:** `Access is denied` - Không thể đổi tên thư mục `attendance_app` thành `Syno_App`.

**Nguyên nhân:** Thư mục `attendance_app` đang được bảo vệ bởi quyền sở hữu và quyền truy cập. Tài khoản hiện tại không có đủ quyền để thực hiện thao tác rename.

**Chi tiết lỗi:**
- Lệnh `takeown` thất bại với: "The current logged on user does not have ownership privileges"
- Lệnh `icacls` đã cấp quyền cho 263 files nhưng thất bại ở: `attendance_app\assets\brand`
- Lệnh `ren` cuối cùng thất bại: "Access is denied"

### 1.2. Các file đang tham chiếu đến "attendance_app"
Cần cập nhật các tham chiếu sau khi đổi tên thành công:

**Trong workspace:**
- `pnpm-workspace.yaml` - liệt kê packages
- `package.json` (root) - có thể chứa tham chiếu

**Trong các file cấu hình:**
- `.gitignore` - có thể chứa tham chiếu
- Các file config khác

## 2. Hướng dẫn thực hiện đổi tên

### 2.1. Cách 1: Chạy Terminal với quyền Administrator
1. Mở **Command Prompt** hoặc **PowerShell** với quyền **Administrator**
2. Di chuyển đến thư mục dự án: `cd /d d:\attendance_app_dev`
3. Thực hiện lệnh:
```bat
takeown /f attendance_app /r /d y
icacls attendance_app /grant %USERNAME%:F /t
ren attendance_app Syno_App
```

### 2.2. Cách 2: Sử dụng File Explorer
1. Mở **File Explorer** với quyền **Administrator**
2. Điều hướng đến `d:\attendance_app_dev`
3. Chuột phải vào thư mục `attendance_app` → **Properties** → **Security** → **Edit** → Thêm quyền Full Control cho tài khoản hiện tại
4. Sau đó đổi tên thủ công

### 2.3. Cách 3: Khởi động lại máy và thử lại
1. Đóng tất cả các ứng dụng đang sử dụng thư mục `attendance_app`
2. Khởi động lại máy
3. Thử lại lệnh rename

## 3. Các bước tiếp theo sau khi đổi tên thành công

### 3.1. Cập nhật tham chiếu trong code
- [ ] Cập nhật `pnpm-workspace.yaml`
- [ ] Cập nhật `package.json` (root)
- [ ] Cập nhật `.gitignore`
- [ ] Cập nhật tất cả import paths trong code Flutter
- [ ] Cập nhật `pubspec.yaml` nếu cần
- [ ] Cập nhật các file cấu hình khác

### 3.2. Test toàn bộ chức năng
- [ ] Chạy `flutter analyze` trong Syno_App
- [ ] Build ứng dụng Flutter
- [ ] Test các màn hình chính:
  - [ ] Login/Authentication
  - [ ] Dashboard
  - [ ] Thông tin cá nhân
  - [ ] Bảng điểm
  - [ ] Thông báo
  - [ ] Sự kiện trường
  - [ ] Cài đặt

### 3.3. Kiểm tra API Backend
- [ ] Test tất cả endpoints của backend
- [ ] Xác nhận dữ liệu trả về đúng format
- [ ] Kiểm tra RLS policies

### 3.4. Báo cáo và kế hoạch fix
- [ ] Tổng hợp danh sách bugs phát hiện được
- [ ] Lập kế hoạch fix theo thứ tự ưu tiên
- [ ] Báo cáo kết quả

## 4. Lưu ý quan trọng
- Thư mục `attendance_app\assets\brand` có vấn đề về quyền truy cập
- Có thể cần kiểm tra xem thư mục này có đang được sử dụng bởi process nào không
- Sau khi đổi tên, cần chạy lại `flutter pub get` để cập nhật dependencies

## 5. Trạng thái
**ĐANG CHỜ:** Cần user thực hiện đổi tên thủ công với quyền Administrator.