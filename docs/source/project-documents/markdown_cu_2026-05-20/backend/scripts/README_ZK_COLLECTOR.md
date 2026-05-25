# ZKteco Collector - Hướng dẫn sử dụng

## 1. Kiểm tra kết nối

Ping máy chấm công để đảm bảo cùng mạng:
```bash
ping 192.168.1.201  # Thay IP máy chấm công của bạn
```

## 2. Cài đặt dependencies

```bash
cd d:\attendance_app_dev\backend
npm install zkteco-js axios
```

## 3. Cấu hình

Sửa file `scripts/zk-collector.env`:
```env
ZK_DEVICE_IP=192.168.1.201    # ← Thay IP máy chấm công
HARDWARE_API_KEY=your-key    # ← Lấy từ backend .env
```

## 4. Chạy Collector

### Cách 1: Nhấn đúp file (Windows)
Tạo file `start-collector.bat`:
```bat
cd /d "%~dp0.."
set /p IP=<scripts\zk-collector.env
node scripts\zk-collector.js
pause
```

### Cách 2: Terminal
```bash
cd d:\attendance_app_dev\backend
node scripts\zk-collector.js
```

## 5. Kiểm tra hoạt động

Khi chạy thành công sẽ thấy:
```
[CONNECT] Device @ 192.168.1.201:4370
[REALTIME] Listening for events...
[OK] Student HS0001 @ 14:30:15
[OK] Student HS0002 @ 14:32:08
```

## 6. Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách fix |
|-----|-------------|----------|
| `connect ECONNREFUSED` | Sai IP hoặc máy chấm công tắt | Kiểm tra IP, đảm bảo máy bật |
| `Authentication failed` | Sai port hoặc protocol | Thử port 4370 hoặc 5055 |
| `401 Unauthorized` | Sai API key | Check HARDWARE_API_KEY trong .env |

## 7. Chạy tự động (Windows Service)

Dùng PM2 hoặc nssm:
```bash
npm install -g pm2
pm2 start scripts/zk-collector.js --name "zk-collector"
pm2 save
pm2 startup
```

## Tích hợp với start_all.bat

Thêm vào cuối `start_all.bat`:
```bat
echo [6/6] Starting ZKteco Collector...
start "zk-collector" cmd /k "cd /d %~dp0backend && node scripts/zk-collector.js"
```
