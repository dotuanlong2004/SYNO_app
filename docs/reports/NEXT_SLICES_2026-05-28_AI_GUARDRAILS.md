# NEXT SLICES 2026-05-28 - SYNO AI Guardrails And Remaining Work

File này dùng cho AI session tiếp theo. Đọc cùng `AGENTS.md`, `CURRENT_STATUS.md`, `PROJECT_MEMORY_SYNO.md`, `docs/reports/HANDOFF_2026-05-28_CODEX_SESSION.md` và `docs/reports/RUNBOOK_2026-05-28_LOCAL_STARTUP.md`.

## 1. Trạng Thái Backup Hiện Tại

Tại thời điểm ghi file này, trạng thái chức năng đã xác nhận:

- Backend chạy trên `http://localhost:3000`.
- Admin Web chạy trên `http://localhost:5173`.
- Super Admin Web chạy trên `http://127.0.0.1:5174`.
- Parent App đã build/cài/launch được trong emulator.
- Tài khoản phụ huynh dùng để test:

```text
long.parent@test.com / 123456
student_code: HS0085
class_id: 10C2
school_id: 1
```

Đã sửa/seed dữ liệu Supabase production:

- `user_profiles.class_id` của phụ huynh Long đã đồng bộ về `10C2`.
- Đã xóa toàn bộ `public.timetables` cũ của `school_id=1`.
- Đã seed:
  - `12` dòng `timetables` cho `10C2`.
  - `1` dòng `fee_notices` cho `HS0085`.
  - `4` dòng `grades` cho `HS0085`.
  - `1` thông báo mới trong `announcements`.

API smoke đã xác nhận với token phụ huynh:

```json
{
  "user_student_code": "HS0085",
  "user_class_id": "10C2",
  "timetable_count": 12,
  "fee_count": 1,
  "grade_count": 4,
  "announcement_count": 2,
  "first_subject": "Toán",
  "fee_total": 2200000
}
```

Verification đã chạy:

```text
corepack pnpm --filter backend test
flutter analyze
flutter test
```

Kết quả:

```text
backend test: pass khi chạy ngoài sandbox
flutter analyze: No issues found
flutter test: All tests passed
```

## 2. File Đã Thay Đổi Trong Lát Cắt Hiện Tại

Các file thuộc lát cắt sync data:

```text
attendance_app/lib/presentation/providers/dashboard_providers.dart
backend/package.json
backend/src/middleware/mobileAuth.ts
backend/src/services/mobileUserContext.ts
backend/scripts/mobile-user-context-contract.test.ts
docs/superpowers/plans/2026-05-28-parent-data-sync.md
docs/reports/RUNBOOK_2026-05-28_LOCAL_STARTUP.md
docs/reports/NEXT_SLICES_2026-05-28_AI_GUARDRAILS.md
```

File đã dở từ handoff trước, không được tự ý revert:

```text
attendance_app/lib/presentation/pages/dashboard_page.dart
```

Nội dung dở của `dashboard_page.dart`:

- Bottom sheet “Trường SYNO” trong tab Hồ sơ.
- Widget `_InfoRow`.
- Đã từng verify `flutter analyze` và `flutter test` pass ở session trước.

## 3. Luật Cấm Cho Gemini/AI Khác

Gemini/AI khác tuyệt đối không được:

1. Không chạy `git reset --hard`, `git checkout --`, `git clean`, hoặc xóa file để “dọn”.
2. Không revert thay đổi của Codex/user.
3. Không sửa `hardware-collector/`.
4. Không sửa backend Firebase Admin, FCM token registration, push dispatch, notification queue/worker.
5. Không đưa `service_role` key vào frontend/app/web.
6. Không disable RLS.
7. Không mở lại grant rộng để chữa lỗi nhanh.
8. Không xóa dữ liệu Supabase production nếu user chưa xác nhận cụ thể bảng/tenant/học sinh.
9. Không commit build output, `bin`, `obj`, `.dart_tool`, `build`, `dist`, log/cache/temp.
10. Không tạo file báo cáo rác như changelog tạm, zip tạm, thư mục extract docs tạm.

Gemini/AI khác phải:

1. Đọc `AGENTS.md` trước.
2. Đọc các file handoff/runbook trong `docs/reports`.
3. Chạy `git status --short` trước khi sửa.
4. Chỉ sửa đúng file liên quan nhiệm vụ.
5. Báo cáo bằng tiếng Việt có dấu.
6. Chạy verification phù hợp và ghi rõ output.
7. Để Codex review/stage/commit/push nếu directive chưa đổi.

## 4. Nhiệm Vụ Còn Lại - Lát Cắt 1: Hoàn Thiện Parent App Data UX

Mục tiêu: dữ liệu Admin tạo lên phải nhìn rõ, đẹp, có trạng thái đúng trong app.

Checklist:

- Kiểm tra màn `Lịch học` sau khi seed data:
  - Hiển thị đủ thứ 2 đến thứ 7.
  - Không còn “Chưa có thời khóa biểu” với tài khoản `HS0085`.
  - Text tiếng Việt có dấu.
  - Không overflow ở màn nhỏ.
- Kiểm tra màn `Học phí`:
  - Hiển thị tổng tiền `2.200.000 đ`.
  - Hiển thị khoản học phí và phụ phí.
  - Trạng thái `unpaid` cần render tiếng Việt là `Chưa thanh toán`.
- Kiểm tra màn `Bảng điểm`:
  - Hiển thị 4 môn: Toán, Ngữ văn, Tiếng Anh, Vật lý.
  - Có điểm giữa kỳ, cuối kỳ, trung bình.
- Kiểm tra màn `Thông báo`:
  - Hiển thị thông báo mới.
  - Không phụ thuộc vào push notification thật.
- Nếu UI đang yếu, polish ngay trong `attendance_app/lib/presentation/pages/dashboard_page.dart`.
- Sau sửa:
  - `flutter analyze`
  - `flutter test`
  - build/cài app theo runbook.

## 5. Nhiệm Vụ Còn Lại - Lát Cắt 2: Admin Web CRUD Ổn Định

Mục tiêu: Admin Web tạo/sửa/xóa dữ liệu học tập và app tự cập nhật.

Checklist:

- Thời khóa biểu:
  - Form tạo lịch phải chọn/nhập lớp `10C2`.
  - Validate `day_of_week`, `start_time`, `end_time`.
  - Sau tạo, bảng Admin refresh.
  - App refresh trong vài giây nhờ provider tick.
- Học phí:
  - Form chọn `student_code=HS0085`.
  - Validate số tiền không âm.
  - Hiển thị lỗi nếu student_code không tồn tại.
- Bảng điểm:
  - Form chọn `student_code=HS0085`.
  - Validate điểm từ 0 đến 10.
  - Tính trung bình đúng contract backend.
- Thông báo:
  - Form gửi thông báo phải lưu DB.
  - App xem được qua API `/api/v1/mobile/announcements`.
  - Checkbox “Gửi push tới phụ huynh” chỉ là push FCM; nếu FCM local chưa đủ credential thì không coi là lỗi DB sync.

Verification:

```bat
corepack pnpm --filter backend test
corepack pnpm --filter admin_web typecheck
corepack pnpm --filter admin_web build
flutter analyze
flutter test
```

## 6. Nhiệm Vụ Còn Lại - Lát Cắt 3: Realtime/Sync Đúng Nghĩa

Hiện tại app tự refetch learning data mỗi `3s` qua:

```text
attendance_app/lib/presentation/providers/dashboard_providers.dart
parentLearningDataRefreshTickProvider
```

Đây là giải pháp tạm để Admin tạo dữ liệu thì app nhìn thấy nhanh.

Thiết kế bền hơn cần làm:

1. Tạo backend `sync_events` hoặc SSE/WebSocket nhẹ cho app.
2. Mỗi Admin mutation tạo event:
   - `timetable_changed`
   - `fee_changed`
   - `grade_changed`
   - `announcement_changed`
3. Parent App subscribe event và invalidate provider đúng loại.
4. Có fallback polling khi realtime mất kết nối.
5. Không phụ thuộc FCM để đồng bộ dữ liệu trong app.

Không dùng FCM làm nguồn dữ liệu chính. FCM chỉ là notification ngoài hệ điều hành.

## 7. Nhiệm Vụ Còn Lại - Lát Cắt 4: Sự Kiện Và Hoạt Động Trường Có Ảnh

Mục tiêu: nhà trường đăng sự kiện/hoạt động, phụ huynh xem trong app.

Đề xuất schema:

```sql
public.school_events
- id bigint primary key
- school_id varchar not null references public.schools(id)
- title varchar not null
- content text not null
- image_url text null
- event_date timestamptz null
- published_at timestamptz not null default now()
- created_by uuid null references auth.users(id)
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()
```

Bắt buộc migration:

- `CREATE TABLE`
- explicit `GRANT`
- `ENABLE ROW LEVEL SECURITY`
- policy school-scoped theo role + `school_id`
- index `school_id, published_at`

Admin Web:

- Tab mới: `Sự kiện`.
- Form title/content/date/image.
- Upload ảnh nên đi qua backend hoặc Supabase Storage có policy rõ.
- Không upload bằng service_role ở frontend.

Parent App:

- Tab/card `Sự kiện trường`.
- Danh sách sự kiện có ảnh, ngày, nội dung.
- Empty/error/loading state tiếng Việt.

Verification:

- DB advisor/RLS review.
- Backend contract tests.
- Admin Web typecheck/build.
- Flutter analyze/test.
- Manual: tạo sự kiện ở Admin, app thấy sự kiện.

## 8. Nhiệm Vụ Còn Lại - Lát Cắt 5: Đồng Bộ Dữ Liệu Qua API Key

Mục tiêu: trường có hệ thống sẵn, nhập API key vào SYNO để kéo dữ liệu.

Không được làm kiểu nhập API key vào frontend rồi gọi trực tiếp từ browser.

Thiết kế an toàn:

- Admin Web chỉ nhập cấu hình.
- Backend lưu cấu hình đã mã hóa hoặc tối thiểu không expose lại secret.
- Backend gọi API bên thứ ba.
- Có nút `Kiểm tra kết nối`.
- Có nút `Đồng bộ thử`.
- Có log kết quả sync.

Đề xuất bảng:

```sql
public.school_api_integrations
- id bigint primary key
- school_id varchar not null references public.schools(id)
- provider_name text not null
- base_url text not null
- api_key_encrypted text not null
- status varchar not null default 'inactive'
- last_checked_at timestamptz null
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()
```

```sql
public.school_api_sync_logs
- id bigint primary key
- school_id varchar not null references public.schools(id)
- integration_id bigint references public.school_api_integrations(id)
- sync_type text not null
- status text not null
- message text null
- started_at timestamptz not null default now()
- finished_at timestamptz null
```

Luồng sync:

1. Admin nhập provider/base URL/API key.
2. Backend validate URL và key.
3. Backend test connection.
4. Backend kéo dữ liệu vào staging parser.
5. Backend map dữ liệu sang `students`, `timetables`, `grades`, `fee_notices`.
6. Backend upsert theo `school_id` và mã nghiệp vụ.
7. Ghi sync log.
8. App nhận dữ liệu qua API SYNO như bình thường.

## 9. Emulator Rule

Hiện trạng đã dọn:

- Chỉ giữ lại `Pixel_10_Pro_XL`.
- Đã gỡ các AVD thừa/lỗi: `Pixel8`, `Pixel8_API_35`, `SYNO_Light_API_37`.
- Không tự tạo emulator mới vì dễ làm nặng máy và phát sinh lỗi vặt.

AI/Gemini phải dùng đúng emulator này:

```text
Pixel_10_Pro_XL
```

Lệnh mở nằm trong:

```text
docs/reports/RUNBOOK_2026-05-28_LOCAL_STARTUP.md
```

## 10. Commit/Push Rule

Sau mỗi lát cắt:

```bat
git status --short
git diff
git add <file-dung-cua-lat-cat>
git commit -m "message"
git push
```

Không stage file ngoài phạm vi nếu chưa hiểu.

Nếu cần backup ngay toàn bộ trạng thái hiện tại:

```bat
git add attendance_app/lib/presentation/pages/dashboard_page.dart
git add attendance_app/lib/presentation/providers/dashboard_providers.dart
git add backend/package.json
git add backend/src/middleware/mobileAuth.ts
git add backend/src/services/mobileUserContext.ts
git add backend/scripts/mobile-user-context-contract.test.ts
git add docs/superpowers/plans/2026-05-28-parent-data-sync.md
git add docs/reports/RUNBOOK_2026-05-28_LOCAL_STARTUP.md
git add docs/reports/NEXT_SLICES_2026-05-28_AI_GUARDRAILS.md
git commit -m "backup: parent data sync working state"
git tag backup-2026-05-28-parent-sync
git push
git push origin backup-2026-05-28-parent-sync
```

Nếu Git bị `.git/index.lock` hoặc permission chặn, không xóa bừa. Kiểm tra process Git trước.
