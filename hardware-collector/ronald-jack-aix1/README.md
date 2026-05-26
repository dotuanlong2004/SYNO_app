# Ronald Jack AI-X1 Real-time Collector

Thu thập dữ liệu chấm công real-time từ máy Ronald Jack AI-X1 và đẩy về backend SYNO.

---

## 🚀 Chạy ngay (Already Built)

Nếu đã có file `.exe` trong `bin\Release\`, chạy helper để tự nạp `HARDWARE_API_KEY` từ `backend\.env`:

```batch
powershell -ExecutionPolicy Bypass -File .\run-collector.ps1
```

---

## 🛠️ Build từ source

### Yêu cầu
- Visual Studio 2019/2022 HOẶC .NET SDK
- .NET Framework 4.7.2+

### Build bằng Visual Studio
1. Mở `TestCOMReflect.csproj`
2. Chọn `Release` + `x86`
3. Build → Build Solution

### Build bằng command line
```batch
dotnet build -c Release
```

---

## ⚙️ Cấu hình trước khi chạy

Không sửa `Program.cs` để đổi môi trường. Collector đọc các biến sau:

```env
AI_X1_DEVICE_IP=192.168.0.225
AI_X1_DEVICE_PORT=4370
AI_X1_MACHINE_NUMBER=1
AI_X1_COMM_PASSWORD=0
SCHOOL_ID=1
BACKEND_HARDWARE_SCAN_URL=http://localhost:3000/api/v1/hardware/scan
AI_X1_POLL_MS=3000
HARDWARE_API_KEY=<same-secret-as-backend>
COLLECTOR_REQUIRE_HARDWARE_API_KEY=true
```

Local helper `run-collector.ps1` set các giá trị dev đã xác minh và từ chối chạy nếu `backend\.env` chưa có `HARDWARE_API_KEY`.

---

## 📊 Luồng hoạt động

```
1. Connect to device qua COM SDK
2. Vòng lặp mỗi 3 giây:
   - ReadAllGLogData() → đọc toàn bộ logs
   - GetAllGLogData() → lấy từng record
   - Filter by timestamp > lastScanTime
   - POST `ma_cham_cong`, `school_id`, `timestamp` lên `/api/v1/hardware/scan`
3. Backend resolve học sinh theo `school_id + ma_cham_cong`, chống trùng, ghi Supabase và gửi FCM
4. Sleep 3s, lặp lại
```

---

## 🔌 SDK Methods được sử dụng

| Method | Mục đích |
|--------|---------|
| `SetIPAddress(ref ip, port, 0)` | Set IP device |
| `OpenCommPort(machineNumber)` | Mở kết nối |
| `ReadAllGLogData(machineNumber)` | Đọc toàn bộ logs vào buffer |
| `GetAllGLogData(...)` | Lấy từng record từ buffer |
| `EnableDevice(machineNumber, 0)` | Tắt device trong lúc đọc |
| `EnableDevice(machineNumber, 1)` | Bật lại device |

---

## 🧪 Test

### Test kết nối
```batch
cd scripts
Register_SDK_x86.bat
cd ..\ronald-jack-aix1
dotnet build -c Release
powershell -ExecutionPolicy Bypass -File .\run-collector.ps1
```

Expected output:
```
🔗 Đang kết nối tới 192.168.0.225:4370...
✅ Kết nối thành công!
👤 Số nhân viên: 50
📊 Tổng log: 1,234
🔄 Polling mỗi 3 giây...
```

### Test scan mới
1. Chạy collector
2. Quét thẻ/vân tay trên device
3. Kiểm tra console → phải thấy "📤 Pushing new scan..."

---

## 🐛 Debug

Thêm logging trong `Program.cs`:
```csharp
Console.WriteLine($"[DEBUG] Raw: Enroll={enrollNumber}, Time={year}-{month}-{day} {hour}:{minute}");
```

---

## 📦 Deploy

### Windows Service (Production)
Tạo Windows Service để chạy background:

```batch
sc create RonaldJackCollector binPath= "C:\full\path\to\TestCOMReflect.exe"
sc start RonaldJackCollector
```

### Auto-start script
Tạo file `start-collector.bat`:
```batch
@echo off
cd /d "%~dp0"
:loop
powershell -ExecutionPolicy Bypass -File .\run-collector.ps1
if errorlevel 1 (
    echo Lỗi, restart sau 5 giây...
    timeout /t 5 /nobreak >nul
    goto loop
)
```

---

## 📝 Data Format

### Payload gửi backend
```json
{
  "ma_cham_cong": "1",
  "school_id": "1",
  "timestamp": "2026-05-11T08:30:00.000Z"
}
```

### Mapping trong Supabase
```sql
students.school_id + students.ma_cham_cong
    ↓
students.id / student_code
    ↓
attendance_logs + parent FCM lookup
```

---

## ⚠️ Lưu ý quan trọng

1. **Platform Target:** Phải là **x86**, không phải AnyCPU hay x64
2. **OCX Registration:** Chạy `Register_SDK_x86.bat` với quyền Admin
3. **Firewall:** Mở port 4370 nếu có firewall
4. **Timestamp:** Luôn so sánh UTC để tránh lỗi timezone
5. **Security:** Không đưa Supabase key vào collector; chỉ dùng `HARDWARE_API_KEY` để gọi backend

---

## 📚 Tham khảo

- Báo cáo kỹ thuật: `../docs/BaoCao_KetNoi_RonaldJack.html`
- SDK Documentation: Ronald Jack Official Manual
- Backend API: `/api/v1/hardware/scan`

---

**Version:** 1.0.0  
**Last Updated:** 2026-05-11
