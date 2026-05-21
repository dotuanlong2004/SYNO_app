# HƯỚNG DẪN CHẠY RONALD JACK AI-X1 COLLECTOR

## Quy trình chạy chuẩn

### CMD 1 — Chạy backend API

Mở terminal/CMD thứ nhất:

```bat
cmd /c "cd /d d:\attendance_app_dev && corepack pnpm --filter backend build && corepack pnpm --filter backend start"
```

Backend chạy đúng khi thấy:

```text
🚀 Attendance API listening on port 3000
📟 Hardware scan: POST /api/v1/hardware/scan
📝 Attendance sync: POST /api/v1/attendance/sync
```

> Ghi chú: dòng `Firebase Admin not initialized` không chặn collector. Khi chưa cấu hình Firebase credentials thì notification chỉ được log.

---

### CMD 2 — Build và chạy AI-X1 collector

Mở terminal/CMD thứ hai:

Tuỳ chọn cấu hình collector qua environment variable. Nếu không set thì collector dùng default dev đã xác minh:

```bat
set AI_X1_DEVICE_IP=192.168.0.225
set AI_X1_DEVICE_PORT=4370
set AI_X1_MACHINE_NUMBER=1
set AI_X1_COMM_PASSWORD=0
set SCHOOL_ID=1
set BACKEND_HARDWARE_SCAN_URL=http://localhost:3000/api/v1/hardware/scan
set AI_X1_POLL_MS=3000
```

Khi chạy production, backend nên bật `HARDWARE_API_KEY`, và collector phải set cùng key:

```bat
set HARDWARE_API_KEY=<same-secret-as-backend>
set COLLECTOR_REQUIRE_HARDWARE_API_KEY=true
```

```bat
dotnet build d:\attendance_app_dev\hardware-collector\ronald-jack-aix1 -c Release
```

Sau khi build thành công, chạy:

```bat
d:\attendance_app_dev\hardware-collector\ronald-jack-aix1\bin\Release\net472\TestCOMReflect.exe
```

Collector chạy đúng khi thấy các dòng tương tự:

```text
RONALD JACK AI-X1 — COM SDK Collector

Thiết bị: 192.168.0.225:4370  |  School: 1

[1] Tải danh sách học sinh từ Supabase... ✓ ...
[Kết nối] OpenCommPort ... ✓ THÀNH CÔNG
[2] Kết nối ✓  SN=...  MachineID=1
[3] Đọc lịch sử log từ máy... ✓ ... bản ghi

REAL-TIME  — Polling 3s — Tự động đẩy Supabase
Đang theo dõi...
```

---

## Trạng thái đã xác nhận ngày 20/05/2026

Đã chạy thành công với output:

```text
[1] Tải danh sách học sinh từ Supabase... ✓ 1 học sinh có mã chấm công
    ma_cham_cong=1 → student_code=HS0085

[Kết nối] OpenCommPort ... ✓ THÀNH CÔNG
[2] Kết nối ✓  SN=AYTD01032550  MachineID=1

[3] Đọc lịch sử log từ máy... ✓ 58 bản ghi

REAL-TIME  — Polling 3s — Tự động đẩy Supabase
Theo dõi log sau: 19/05/2026 16:12:00
```

Kết luận:

- Backend API chạy OK trên port `3000`.
- Project `hardware-collector\ronald-jack-aix1` build OK.
- Collector đọc config từ environment variable; default dev vẫn là AI-X1 `192.168.0.225:4370`, `school_id=1`, backend local port `3000`.
- `TestCOMReflect.exe` chạy OK.
- COM SDK kết nối được máy Ronald Jack AI-X1 qua `192.168.0.225:4370`.
- Máy trả về serial `AYTD01032550`.
- Collector đọc được `58` bản ghi lịch sử.
- Collector đang polling real-time mỗi `3s`.

---

## Cách kiểm tra khi có học sinh chấm công

Giữ CMD 1 và CMD 2 đang chạy.

Khi học sinh chấm công trên máy AI-X1, CMD 2 sẽ tự phát hiện log mới và đẩy về backend/Supabase.

Nếu không thấy log mới:

1. Kiểm tra máy AI-X1 vẫn ở IP:
   ```text
   192.168.0.225
   ```

2. Kiểm tra port:
   ```text
   4370
   ```

3. Kiểm tra backend vẫn chạy:
   ```text
   Attendance API listening on port 3000
   ```

4. Build lại collector:
   ```bat
   dotnet build d:\attendance_app_dev\hardware-collector\ronald-jack-aix1 -c Release
   ```

5. Chạy lại collector:
   ```bat
   d:\attendance_app_dev\hardware-collector\ronald-jack-aix1\bin\Release\net472\TestCOMReflect.exe
   ```

---

## Lưu ý quan trọng

- Không dùng nhầm flow cũ `C:\ZKCollector\x86\ZKCollector.exe --console` cho AI-X1 hiện tại.
- Flow chuẩn hiện tại là:
  1. Backend: `d:\attendance_app_dev\backend`
  2. Collector: `d:\attendance_app_dev\hardware-collector\ronald-jack-aix1\bin\Release\net472\TestCOMReflect.exe`
- Collector cần backend chạy trước để đẩy dữ liệu ổn định.
