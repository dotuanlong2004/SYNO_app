# Báo cáo: Sửa lỗi SSE Sync và Cycle Dependency (2026-05-29)

## 1. Vấn đề
- Lỗi `argument_type_not_assignable` trong `sse_service.dart` khi xử lý stream từ Dio.
- Lỗi `top_level_cycle` trong `dashboard_providers.dart` do vòng lặp dependency giữa `sseSyncProvider` và các provider dữ liệu (timetable, fee, v.v.).

## 2. Giải pháp
- **Sửa `sse_service.dart`**:
  - Sử dụng `.cast<List<int>>()` trước khi `transform(utf8.decoder)` để đảm bảo kiểu dữ liệu stream khớp với yêu cầu của `utf8.decoder`.
  - Loại bỏ import `dart:typed_data` không cần thiết.
- **Sửa `dashboard_providers.dart`**:
  - Loại bỏ `sseSyncProvider` (gây cycle).
  - Định nghĩa `sseEventsProvider` (StreamProvider) để expose stream sự kiện từ `SseService`.
  - Cập nhật các provider (timetable, fee, announcement, chat, grade, attendance, students) sử dụng `ref.listen<AsyncValue<Map<String, dynamic>>>(sseEventsProvider, ...)` để tự lắng nghe sự kiện và gọi `ref.invalidateSelf()` khi có dữ liệu mới thay đổi.
  - Cách này giúp loại bỏ hoàn toàn vòng lặp dependency.

## 3. Kết quả
- `flutter analyze` đã chạy thành công (chỉ còn các cảnh báo `avoid_print` không nghiêm trọng).
- Hệ thống SSE đã sẵn sàng để sync dữ liệu realtime giữa backend và mobile app.