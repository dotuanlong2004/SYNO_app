# RUNBOOK 2026-05-28 - SYNO Local Startup

File này ghi lệnh mở thủ công backend, 2 web admin, emulator và app Parent App trong emulator.

## 1. Backend API

Chạy từ repo root:

```bat
cd /d d:\attendance_app_dev
corepack pnpm --filter backend build
corepack pnpm --filter backend start
```

Backend chạy tại:

```text
http://localhost:3000
```

Kiểm tra health:

```bat
curl http://localhost:3000/health
```

Kết quả mong muốn:

```json
{"ok":true,"supabase":"up","queue":"disabled (ENABLE_ATTENDANCE_QUEUE=false)"}
```

Lưu ý:

- Nếu backend cần truy cập Supabase thật trong môi trường Codex sandbox, phải chạy ngoài sandbox/escalated.
- Không bật queue nếu chưa kiểm tra `.env`.
- Không commit `backend/.env`, service account Firebase, log, cache.

## 2. Admin Web

Chạy từ repo root:

```bat
cd /d d:\attendance_app_dev
corepack pnpm --filter admin_web dev -- --host 127.0.0.1 --port 5173
```

URL:

```text
http://localhost:5173
```

Tài khoản admin đang dùng trong UI hiện tại:

```text
Admin School 2
```

## 3. Super Admin Web

Chạy từ repo root:

```bat
cd /d d:\attendance_app_dev
corepack pnpm --filter super_admin_web dev
```

URL:

```text
http://127.0.0.1:5174
```

Tài khoản test:

```text
superadmin@syno.local / 123456
```

## 4. Android SDK Và ADB

SDK đang dùng:

```text
D:\Sdk
```

ADB:

```bat
D:\Sdk\platform-tools\adb.exe devices
```

Nếu ADB báo unauthorized/offline:

```bat
set ADB_VENDOR_KEYS=C:\Users\ASUS\.android\adbkey
D:\Sdk\platform-tools\adb.exe kill-server
D:\Sdk\platform-tools\adb.exe start-server
D:\Sdk\platform-tools\adb.exe devices
```

## 5. Emulator Đang Dùng

AVD ổn định nhất hiện tại:

```text
Pixel_10_Pro_XL
```

Mở emulator:

```bat
D:\Sdk\emulator\emulator.exe -avd Pixel_10_Pro_XL -no-snapshot-load -no-boot-anim -gpu host
```

Chờ Android boot xong, không chỉ chờ ADB:

```powershell
$env:ADB_VENDOR_KEYS='C:\Users\ASUS\.android\adbkey'
for ($i = 0; $i -lt 60; $i++) {
  $boot = D:\Sdk\platform-tools\adb.exe -s emulator-5554 shell getprop sys.boot_completed 2>$null
  if ($boot -match '1') { 'boot_completed=1'; exit 0 }
  Start-Sleep -Seconds 3
}
'boot_completed timeout'
exit 1
```

Lưu ý emulator:

- `Pixel8_API_35` hiện không boot được vì SDK thiếu system image Android 34.
- `SYNO_Light_API_37` đã thử tạo thủ công nhưng bị lỗi display/splash, không dùng để kiểm tra app.
- `Pixel_10_Pro_XL` có thể hiện ANR `com.android.systemui` lúc mới boot. Bấm `Wait` hoặc dùng phím/tap để dismiss rồi chờ thêm.

## 6. Build Parent App

Chạy từ thư mục app:

```bat
cd /d d:\attendance_app_dev\attendance_app
set ANDROID_SDK_ROOT=D:\Sdk
set ANDROID_HOME=D:\Sdk
D:\tools\flutter\bin\flutter.bat build apk --debug
```

APK tạo tại:

```text
d:\attendance_app_dev\attendance_app\build\app\outputs\flutter-apk\app-debug.apk
```

## 7. Gỡ App Trong Emulator

```bat
set ADB_VENDOR_KEYS=C:\Users\ASUS\.android\adbkey
D:\Sdk\platform-tools\adb.exe -s emulator-5554 uninstall com.example.attendance_app
```

Nếu uninstall lỗi nhưng cần cập nhật app, có thể cài đè bằng `install -r -d -t`.

## 8. Cài/Cập Nhật App Trong Emulator

```bat
cd /d d:\attendance_app_dev\attendance_app
set ADB_VENDOR_KEYS=C:\Users\ASUS\.android\adbkey
D:\Sdk\platform-tools\adb.exe -s emulator-5554 install -r -d -t build\app\outputs\flutter-apk\app-debug.apk
```

Kết quả mong muốn:

```text
Performing Streamed Install
Success
```

## 9. Launch App Trong Emulator

```bat
set ADB_VENDOR_KEYS=C:\Users\ASUS\.android\adbkey
D:\Sdk\platform-tools\adb.exe -s emulator-5554 shell input keyevent KEYCODE_WAKEUP
D:\Sdk\platform-tools\adb.exe -s emulator-5554 shell wm dismiss-keyguard
D:\Sdk\platform-tools\adb.exe -s emulator-5554 shell am start -n com.example.attendance_app/.MainActivity
```

Hoặc:

```bat
D:\Sdk\platform-tools\adb.exe -s emulator-5554 shell monkey -p com.example.attendance_app 1
```

Kiểm tra app đang focus:

```bat
D:\Sdk\platform-tools\adb.exe -s emulator-5554 shell dumpsys window | findstr mCurrentFocus
```

Kết quả mong muốn:

```text
com.example.attendance_app/com.example.attendance_app.MainActivity
```

## 10. Tài Khoản Parent App Đang Dùng

```text
long.parent@test.com / 123456
```

Tài khoản này liên kết:

```text
student_code: HS0085
student_name: Long
class_id/class_name: 10C2
school_id: 1
```

## 11. Verify Nhanh

Backend:

```bat
cd /d d:\attendance_app_dev
corepack pnpm --filter backend test
```

Flutter:

```bat
cd /d d:\attendance_app_dev\attendance_app
D:\tools\flutter\bin\flutter.bat analyze
D:\tools\flutter\bin\flutter.bat test
```

API parent data smoke:

```powershell
$body = @{ email = 'long.parent@test.com'; password = '123456' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/auth/login -ContentType 'application/json' -Body $body
$headers = @{ Authorization = "Bearer $($login.access_token)" }
Invoke-RestMethod -Uri http://localhost:3000/api/v1/mobile/timetable -Headers $headers
Invoke-RestMethod -Uri http://localhost:3000/api/v1/mobile/fees -Headers $headers
Invoke-RestMethod -Uri http://localhost:3000/api/v1/mobile/grades -Headers $headers
Invoke-RestMethod -Uri http://localhost:3000/api/v1/mobile/announcements -Headers $headers
```
