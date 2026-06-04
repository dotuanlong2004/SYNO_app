# Ronald Jack AI-X1 - Cấu hình collector không sửa code

File này ghi cách cấu hình collector máy chấm công Ronald Jack AI-X1.

## 1. File cấu hình chính

Collector đọc cấu hình từ:

```text
hardware-collector/ronald-jack-aix1/collector-config.json
```

Nội dung hiện tại:

```json
{
  "AI_X1_DEVICE_IP": "10.160.45.225",
  "AI_X1_DEVICE_PORT": 4370,
  "AI_X1_MACHINE_NUMBER": 1,
  "AI_X1_COMM_PASSWORD": 0,
  "SCHOOL_ID": "1",
  "BACKEND_HARDWARE_SCAN_URL": "http://localhost:3000/api/v1/hardware/scan",
  "AI_X1_POLL_MS": 3000,
  "COLLECTOR_REQUIRE_HARDWARE_API_KEY": true
}
```

Không sửa `Program.cs` khi đổi IP. Nếu mạng đổi, chỉ sửa `AI_X1_DEVICE_IP` trong file JSON này.

## 2. Lệnh chạy chuẩn

Mở backend trước:

```bat
cd /d d:\attendance_app_dev
corepack pnpm --filter backend build
corepack pnpm --filter backend start
```

Mở terminal khác, build và chạy collector:

```bat
cd /d d:\attendance_app_dev
dotnet build d:\attendance_app_dev\hardware-collector\ronald-jack-aix1 -c Release
powershell -NoProfile -ExecutionPolicy Bypass -File d:\attendance_app_dev\hardware-collector\ronald-jack-aix1\run-collector.ps1
```

`run-collector.ps1` tự nạp `HARDWARE_API_KEY` từ `backend\.env`, rồi truyền đường dẫn `collector-config.json` cho collector.

## 3. Cách kiểm tra mạng trước khi chạy collector

Ví dụ IP máy chấm công là `10.160.45.225`:

```bat
ping 10.160.45.225
powershell -NoProfile -Command "Test-NetConnection 10.160.45.225 -Port 4370"
```

Collector chỉ chạy được khi:

```text
TcpTestSucceeded : True
```

Ping có thể bị chặn tùy thiết bị/mạng, nhưng TCP port `4370` phải True.

## 4. Có thể không cần đổi cấu hình khi đổi Wi-Fi không?

Không thể đảm bảo bằng code nếu dùng kết nối LAN trực tiếp theo IP nội bộ.

Lý do:

- Khi đổi Wi-Fi, laptop và máy chấm công có thể nhận dải IP khác.
- Wi-Fi công cộng có thể chặn thiết bị nội bộ nhìn thấy nhau.
- Collector cần gọi trực tiếp tới IP/port của máy chấm công.

Cách ổn định lâu dài:

1. Dùng router riêng cho trường.
2. Gán IP cố định hoặc DHCP reservation cho máy chấm công, ví dụ `192.168.10.225`.
3. Cho laptop/mini PC chạy collector luôn nằm trong cùng mạng đó.
4. Không dùng Wi-Fi công cộng có client isolation cho máy chấm công.

Nếu bắt buộc đổi mạng thường xuyên, chỉ sửa `AI_X1_DEVICE_IP` trong `collector-config.json`, không sửa code.

## 5. Environment variable override

Nếu cần chạy tạm IP khác mà không sửa file JSON:

```bat
set AI_X1_DEVICE_IP=10.160.45.225
set COLLECTOR_CONFIG_PATH=d:\attendance_app_dev\hardware-collector\ronald-jack-aix1\collector-config.json
d:\attendance_app_dev\hardware-collector\ronald-jack-aix1\bin\Release\net472\TestCOMReflect.exe
```

Thứ tự ưu tiên cấu hình:

```text
Environment variable > collector-config.json > default trong code
```
