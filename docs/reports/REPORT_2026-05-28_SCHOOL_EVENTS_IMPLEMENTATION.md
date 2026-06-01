# Báo cáo triển khai tính năng Sự kiện trường (School Events)

## 1. Mục tiêu
Triển khai tính năng quản lý và hiển thị sự kiện của nhà trường cho cả Admin (quản lý) và Phụ huynh (theo dõi).

## 2. Chi tiết thực hiện

### 2.1. Cơ sở dữ liệu (Supabase/PostgreSQL)
- **Migration**: Tạo bảng `school_events` với các trường:
    - `id`: UUID (Primary Key)
    - `school_id`: UUID (Foreign Key tới `schools`, bắt buộc để phân tách tenant)
    - `title`: Text (Tiêu đề sự kiện)
    - `content`: Text (Nội dung chi tiết)
    - `image_url`: Text (Đường dẫn ảnh minh họa)
    - `published_at`: Timestamp (Ngày diễn ra/công bố sự kiện)
    - `created_at`: Timestamp
    - `updated_at`: Timestamp
- **Bảo mật (RLS)**: 
    - Admin: Toàn quyền CRUD dựa trên `school_id`.
    - Phụ huynh: Chỉ quyền SELECT dựa trên `school_id`.

### 2.2. Backend API (Node.js/Express)
- **Admin Endpoints**:
    - `POST /api/v1/admin/events`: Tạo sự kiện mới.
    - `PUT /api/v1/admin/events/:id`: Cập nhật sự kiện.
    - `DELETE /api/v1/admin/events/:id`: Xóa sự kiện.
    - `GET /api/v1/admin/events`: Lấy danh sách sự kiện của trường.
- **Mobile Endpoint**:
    - `GET /api/v1/events`: Lấy danh sách sự kiện sắp tới cho phụ huynh (đã filter theo `school_id` của user).

### 2.3. Admin Web (React)
- Thêm Tab **"Sự kiện"** vào giao diện quản trị.
- Triển khai giao diện danh sách sự kiện, form thêm/sửa sự kiện với đầy đủ các trường thông tin.
- Tích hợp gọi API backend để quản lý dữ liệu thực tế.

### 2.4. Parent App (Flutter)
- **Provider**: Cập nhật `dashboard_providers.dart` để thêm `eventsProvider` (sử dụng `FutureProvider` và lắng nghe SSE để tự động refresh).
- **UI**: Cập nhật `DashboardPage` -> `_ProfileTab`:
    - Thêm section **"Sự kiện sắp tới"** nằm giữa Bảng điểm và Thông báo.
    - Hiển thị dạng Card bao gồm: Ảnh minh họa, Tiêu đề, Nội dung và Ngày diễn ra (định dạng `dd/MM/yyyy`).
    - Tích hợp `RefreshIndicator` để cập nhật lại danh sách sự kiện khi kéo để làm mới.

## 3. Kết quả kiểm tra
- [x] Admin có thể tạo, sửa, xóa sự kiện thành công.
- [x] Dữ liệu sự kiện được phân tách đúng theo `school_id`.
- [x] App Phụ huynh hiển thị đúng danh sách sự kiện từ API.
- [x] Giao diện App đồng bộ với style chung của hệ thống (Sử dụng `AppTheme`).

## 4. Kết luận
Tính năng Sự kiện trường đã hoàn thành đúng theo yêu cầu trong file `NEXT_SLICES_2026-05-28_AI_GUARDRAILS.md` và tuân thủ các quy tắc bảo mật RLS của hệ thống SYNO.