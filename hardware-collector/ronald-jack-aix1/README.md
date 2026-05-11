# Ronald Jack AI-X1 Real-time Collector

Thu thập dữ liệu chấm công real-time từ máy Ronald Jack AI-X1 và đẩy về backend.

---

## 🚀 Chạy ngay (Already Built)

Nếu đã có file `.exe` trong `bin\Release\`:

```batch
TestCOMReflect.exe
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
dotnet build -c Release -r win-x86
```

---

## ⚙️ Cấu hình trước khi chạy

### 1. Device IP
Mở `Program.cs`, tìm dòng:
```csharp
string ip = "192.168.0.225";
int port = 4370;
```
Sửa IP cho đúng với mạng của bạn.

### 2. Backend URL
Tìm dòng:
```csharp
string backendUrl = "http://localhost:3000/api/v1/hardware/scan";
```
Sửa thành URL backend thực tế.

### 3. Supabase Config
Tìm và sửa:
```csharp
string supabaseUrl = "https://your-project.supabase.co";
string supabaseKey = "your-anon-key";
string schoolId = "your-school-id";
```

---

## 📊 Luồng hoạt động

```
1. Load student map từ Supabase (ma_cham_cong → student_code)
2. Connect to device qua COM SDK
3. Vòng lặp mỗi 3 giây:
   - ReadAllGLogData() → đọc toàn bộ logs
   - GetAllGLogData() → lấy từng record
   - Filter by timestamp > lastScanTime
   - POST /api/v1/hardware/scan cho mỗi scan mới
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
dotnet run
```

Expected output:
```
🔗 Đang kết nối tới 192.168.0.225:4370...
✅ Kết nối thành công!
👤 Số nhân viên: 50
📊 Tổng log: 1,234
✅ Student map loaded: 1 students
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
dotnet run
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
  "student_id": "HS0085",
  "school_id": "uuid-here",
  "timestamp": "2026-05-11T08:30:00.000Z"
}
```

### Mapping trong Supabase
```sql
students.ma_cham_cong (device enroll_id)
    ↓
students.student_code (e.g., HS0085)
    ↓
user_profiles.student_code (link to parent)
```

---

## ⚠️ Lưu ý quan trọng

1. **Platform Target:** Phải là **x86**, không phải AnyCPU hay x64
2. **OCX Registration:** Chạy `Register_SDK_x86.bat` với quyền Admin
3. **Firewall:** Mở port 4370 nếu có firewall
4. **Timestamp:** Luôn so sánh UTC để tránh lỗi timezone

---

## 📚 Tham khảo

- Báo cáo kỹ thuật: `../docs/BaoCao_KetNoi_RonaldJack.html`
- SDK Documentation: Ronald Jack Official Manual
- Backend API: `/api/v1/hardware/scan`

---

**Version:** 1.0.0  
**Last Updated:** 2026-05-11
