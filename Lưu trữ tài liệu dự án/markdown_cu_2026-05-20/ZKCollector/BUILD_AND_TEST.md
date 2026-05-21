# BUILD & TEST - ZKCollector

## Status

✅ **Đã xong**:
- Edge Function deployed (v2) - tương thích schema hiện tại
- Supabase keys đã cập nhật trong code
- 306 học sinh đã có trong DB (chỉ cần đảm bảo `ma_cham_cong` khớp với máy)

## Bước 1: Build (1 phút)

```cmd
cd D:\attendance_app_dev\ZKCollector
dotnet build -c Release
```

Output: `bin\Release\net472\ZKCollector.exe`

## Bước 2: Test Console Mode

```cmd
mkdir C:\ZKCollector\logs

# Copy file từ build (chỉ cần .exe và .dll dependencies)
xcopy /Y D:\attendance_app_dev\ZKCollector\bin\Release\net472\ZKCollector.exe C:\ZKCollector\
xcopy /Y D:\attendance_app_dev\ZKCollector\bin\Release\net472\*.dll C:\ZKCollector\

# Chạy test (zkemkeeper.dll đã có sẵn trong C:\Windows\SysWOW64\)
cd C:\ZKCollector
ZKCollector.exe --console
```

**Expected output**:
```
=== ZKCollector Service Starting ===
Device: 192.168.0.225:4370
Supabase: https://bimepdqcwpsynjimvenn.supabase.co
✓ zkemkeeper COM object initialized
...
✓ Connected to 192.168.0.225:4370
✓ Real-time event registered
```

## Bước 3: Test Real-time

**Trên máy AI-X1**:
1. Đảm bảo đã đăng ký khuôn mặt (có ID = ma_cham_cong)
2. Quét mặt

**Trên laptop**:
- Phải thấy log: `REALTIME: Enroll=XXX, Time=HH:mm:ss`
- Phải thấy: `✓ Edge Function: {"inserted":1,"skipped":0}`

## Bước 4: Kiểm tra trong Supabase

```sql
-- Log vừa insert
SELECT s.student_code, s.full_name, al.log_type, al.scanned_at
FROM attendance_logs al
JOIN students s ON s.id = al.student_id
ORDER BY al.scanned_at DESC
LIMIT 5;
```

## Bước 5: Cài Windows Service (Sau khi test OK)

**Run as Administrator**:
```cmd
cd D:\attendance_app_dev\ZKCollector
INSTALL.bat
```

## Troubleshooting

| Lỗi | Fix |
|-----|-----|
| `Error -2` | Máy bận - đóng phần mềm khác đang dùng port 4370 |
| `COM object failed` | Chạy `regsvr32 C:\ZKCollector\zkemkeeper.dll` |
| `Edge Function 401` | Key sai - đã fix trong code |
| `Student not found` | Kiểm tra `ma_cham_cong` trong Supabase khớp với ID máy |

## Lưu ý quan trọng

**ma_cham_cong**: Mỗi học sinh trong Supabase phải có `ma_cham_cong` = ID đăng ký trên máy AI-X1.

Kiểm tra:
```sql
SELECT student_code, full_name, ma_cham_cong FROM students WHERE ma_cham_cong IS NOT NULL LIMIT 10;
```

Nếu `ma_cham_cong` NULL hoặc không khớp → cần update.
