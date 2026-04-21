# Kế hoạch dự án

# 📱 Kế hoạch Dự án: Hệ sinh thái App Phụ Huynh & Quản lý Trường học

Dự án xây dựng hệ thống phần mềm quản lý trường học toàn diện, giúp kết nối thông tin giữa nhà trường và phụ huynh một cách tự động, nhanh chóng và bảo mật.

## 🎯 Mục tiêu Cốt lõi

1. **Chức năng đăng nhập & Định danh:** Phụ huynh đăng ký tài khoản và liên kết chính xác với học sinh thông qua "Mã liên kết" (Link Code).
2. **Thông báo Điểm danh Real-time:** Kết nối trực tiếp máy chấm công (Ronald Jack AI-X1) dưới trường học, tự động đẩy thông báo Push Notification (Firebase) về App phụ huynh khi học sinh quẹt thẻ/quét mặt.
3. **Tra cứu Học tập:** Hiển thị Thời khóa biểu và Sổ điểm chi tiết theo đúng tài khoản học sinh đã được liên kết.
4. **Quản lý Học phí:** Tra cứu các khoản phí, trạng thái đóng tiền của từng học sinh.

---

## 🚀 Tiến độ Dự án (Project Status)

### Giai đoạn 1: Cơ sở hạ tầng & Xác thực (Đang hoàn thiện 🟢)

- Khởi tạo Database PostgreSQL trên VPS.
- Khởi tạo Backend API Node.js.
- Thiết lập bộ khung UI Flutter App (Cross-platform: Mobile, Web, Tablet).
- Tính năng Đăng nhập cho Giáo viên/Admin.
- Tính năng Đăng ký tài khoản Phụ huynh qua "Mã liên kết".
- Kịch bản sinh random `link_code` tự động dưới Database.
- (Pending) Màn hình Admin quản lý danh sách học sinh và Copy Mã liên kết.

### Giai đoạn 2: Hệ thống Điểm danh & Thông báo (Đang triển khai 🟡)

- Xây dựng Database Schema lưu log chấm công `attendance_logs`).
- Backend API nhận dữ liệu quét thẻ và logic lọc SPAM 10 phút.
- Logic chuyển đổi trạng thái Vào/Ra tự động (In/Out state).
- (Pending) Code `Local Agent` (Node.js) cài dưới máy chủ trường học để kết nối máy Ronald Jack qua LAN (TCP:4370) và đẩy API lên Cloud.
- (Pending) Tích hợp Firebase Cloud Messaging (FCM) vào Backend và App Flutter để bắn thông báo.

### Giai đoạn 3: Thông tin Học tập (Chờ triển khai ⚪)

- API & Giao diện (Responsive) cho Thời khóa biểu.
- (Pending) API & Giao diện cho Sổ điểm (Grades).

### Giai đoạn 4: Tài chính & Học phí (Chờ triển khai ⚪)

- (Pending) Thiết kế Database Schema cho các khoản thu/Học phí.
- (Pending) API & Giao diện tra cứu học phí trên App.

---

## 🛠 Kiến trúc Hệ thống (Tech Stack)

- **Frontend (App/Web):** Flutter (Dart)
- **Backend API:** Node.js (Express)
- **Database:** PostgreSQL (Cloud VPS)
- **Hardware Bridge (Local Agent):** Node.js `node-zklib`, SQLite buffer, node-windows)
- **Push Notifications:** Firebase (FCM)

---

## 🔐 Cấu hình Firebase (Push Notification)

File `google-services.json` **KHÔNG** được commit lên Git. Để chạy app Android:

### Bước 1: Lấy file từ Firebase Console
1. Vào https://console.firebase.google.com/
2. Chọn project `attendanceapp-82270`
3. ⚙️ Settings → Project settings → General
4. Scroll xuống "Your apps" → chọn Android app
5. Click **"Download google-services.json"**

### Bước 2: Đặt file vào đúng vị trí
```
attendance_app/android/app/google-services.json
```

> ⚠️ **Lưu ý:** File này chứa API key. KHÔNG được push lên GitHub!

### File Template
Nếu chưa có quyền truy cập Firebase, copy file `google-services.json.example` và điền thông tin của bạn.