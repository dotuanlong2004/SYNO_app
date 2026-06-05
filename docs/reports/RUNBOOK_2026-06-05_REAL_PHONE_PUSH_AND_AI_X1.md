# RUNBOOK 2026-06-05 - SYNO Real Phone, Push Notification, AI-X1

File này dùng để tự chạy SYNO trên máy Windows hiện tại, cài APK lên điện thoại thật, kết nối máy chấm công Ronald Jack AI-X1 và kiểm tra thông báo đẩy về điện thoại.

## 0. Thông Tin Cố Định Hiện Tại

Repo:

```bat
D:\attendance_app_dev
```

Backend LAN hiện tại:

```text
http://10.160.45.35:3000
```

Máy chấm công AI-X1:

```text
IP: 10.160.45.225
Port: 4370
```

Tài khoản app phụ huynh đang test:

```text
long.parent@test.com / 123456
Học sinh: HS0085 - Long - 10C2
```

APK Release mới nhất:

```text
https://github.com/dotuanlong2004/SYNO_app/releases/tag/parent-app-apk-2026-06-05-notification-fix
```

Trong trang đó, mở mục `Assets` và tải:

```text
syno-parent-app-notification-fix-2026-06-05.apk
```

## 1. Kiểm Tra IP Máy Backend

Mở CMD hoặc PowerShell:

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object IPAddress,InterfaceAlias,AddressState
```

Kết quả hiện tại nên có:

```text
10.160.45.35  Wi-Fi  Preferred
```

Nếu IP Wi-Fi đổi, điện thoại thật sẽ không gọi được APK cũ. Khi đó phải build lại APK với IP mới ở mục 7.

## 2. Kiểm Tra Firebase Service Account

File backend cần có:

```text
D:\attendance_app_dev\backend\firebase-service-account.json
```

Kiểm tra:

```powershell
Test-Path D:\attendance_app_dev\backend\firebase-service-account.json
```

Kết quả mong muốn:

```text
True
```

Trong `backend\.env` phải có:

```env
GOOGLE_APPLICATION_CREDENTIALS=D:\attendance_app_dev\backend\firebase-service-account.json
```

Kiểm tra nhanh:

```powershell
Select-String -Path D:\attendance_app_dev\backend\.env -Pattern '^GOOGLE_APPLICATION_CREDENTIALS='
```

Lưu ý:

- Không commit `firebase-service-account.json`.
- Không gửi nội dung file này lên chat.
- Nếu thiếu file, lấy lại trong Firebase Console > Project settings > Service accounts > Firebase Admin SDK > Generate new private key.

## 3. Mở Backend

Mở terminal 1:

```bat
cd /d D:\attendance_app_dev
corepack pnpm --filter backend build
corepack pnpm --filter backend start
```

Backend chạy đúng khi có:

```text
Attendance API listening on port 3000
Hardware scan: POST /api/v1/hardware/scan
Attendance sync: POST /api/v1/attendance/sync
```

Không được có dòng này nếu muốn push thật:

```text
Firebase Admin not initialized (no credentials)
```

Kiểm tra health từ terminal khác:

```bat
curl http://10.160.45.35:3000/health
```

Kết quả mong muốn:

```json
{"ok":true,"supabase":"up","queue":"disabled (ENABLE_ATTENDANCE_QUEUE=false)"}
```

Nếu điện thoại không vào được backend, kiểm tra firewall:

```powershell
Get-NetFirewallRule -DisplayName "SYNO Backend 3000" -ErrorAction SilentlyContinue
```

Nếu chưa có rule:

```powershell
New-NetFirewallRule -DisplayName "SYNO Backend 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

## 4. Test Firebase Push Thật

Chạy từ repo root:

```bat
cd /d D:\attendance_app_dev
corepack pnpm --filter backend fcm:test-push -- --user-id=2e720f65-7556-4ff7-a062-b91498f1bf2f --title="SYNO test" --body="Kiểm tra thông báo hệ điều hành"
```

Kết quả đúng:

```json
"mocked": false
```

Nếu ra:

```json
"mocked": true
```

thì backend chưa nạp Firebase Admin credential. Quay lại mục 2 và restart backend.

Nếu lỗi `has no fcm_token`, app trên điện thoại chưa gửi token lên database. Gỡ app, cài lại APK, đăng nhập và bật quyền thông báo.

## 5. Chạy Máy Chấm Công AI-X1 Collector

Kiểm tra máy chấm công:

```powershell
Test-NetConnection -ComputerName 10.160.45.225 -Port 4370
```

Kết quả mong muốn:

```text
TcpTestSucceeded : True
```

Build collector:

```bat
dotnet build D:\attendance_app_dev\hardware-collector\ronald-jack-aix1 -c Release
```

Kết quả mong muốn:

```text
Build succeeded.
0 Warning(s)
0 Error(s)
```

Chạy collector:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File D:\attendance_app_dev\hardware-collector\ronald-jack-aix1\run-collector.ps1
```

Collector chạy đúng khi thấy:

```text
Kết nối ... THÀNH CÔNG
REAL-TIME ... Polling 3s
Đang theo dõi...
```

Không đóng terminal collector trong lúc test chấm công.

## 6. Cài APK Từ GitHub Lên Điện Thoại

Tải APK ở GitHub Release:

```text
https://github.com/dotuanlong2004/SYNO_app/releases/tag/parent-app-apk-2026-06-05-notification-fix
```

Trong `Assets`, tải:

```text
syno-parent-app-notification-fix-2026-06-05.apk
```

Trên điện thoại:

1. Gỡ app SYNO cũ trước.
2. Cài APK mới.
3. Mở app.
4. Đăng nhập:

```text
long.parent@test.com / 123456
```

5. Khi Android hỏi quyền thông báo, bấm `Cho phép`.

Nếu không hiện popup xin quyền thông báo:

```text
Cài đặt điện thoại > Ứng dụng > SYNO > Thông báo > Bật
```

Sau đó đăng xuất và đăng nhập lại một lần để app gửi FCM token mới lên backend.

## 7. Build APK Mới Khi IP Máy Backend Đổi

Nếu IP máy backend không còn là `10.160.45.35`, build lại APK.

Ví dụ IP mới là `10.160.45.99`:

```bat
cd /d D:\attendance_app_dev\attendance_app
set ANDROID_SDK_ROOT=D:\Sdk
set ANDROID_HOME=D:\Sdk
D:\tools\flutter\bin\flutter.bat build apk --release --dart-define=API_BASE_URL=http://10.160.45.99:3000
```

APK tạo tại:

```text
D:\attendance_app_dev\attendance_app\build\app\outputs\flutter-apk\app-release.apk
```

Cài bằng USB nếu điện thoại bật USB debugging:

```bat
D:\Sdk\platform-tools\adb.exe devices
D:\Sdk\platform-tools\adb.exe install -r -d -t D:\attendance_app_dev\attendance_app\build\app\outputs\flutter-apk\app-release.apk
```

Nếu muốn gỡ trước:

```bat
D:\Sdk\platform-tools\adb.exe uninstall com.example.attendance_app
```

## 8. Upload APK Lên GitHub Release

Máy này không có `gh` CLI, nhưng có thể upload bằng GitHub API nếu Git Credential Manager còn token.

Trước hết commit/push code nếu có thay đổi:

```bat
cd /d D:\attendance_app_dev
git status --short
git add <file-can-commit>
git commit -m "your-commit-message"
git push origin main
```

Không commit:

```text
backend/firebase-service-account.json
attendance_app/android/app/google-services.json
attendance_app/build/
backend/.env
```

Nếu cần upload APK, dùng script PowerShell mẫu, đổi tag và tên asset:

```powershell
$repo='dotuanlong2004/SYNO_app'
$apk='D:\attendance_app_dev\attendance_app\build\app\outputs\flutter-apk\app-release.apk'
$tag='parent-app-apk-YYYY-MM-DD'
$assetName='syno-parent-app-YYYY-MM-DD.apk'

$inFile=Join-Path $env:TEMP 'gitcred.in'
$outFile=Join-Path $env:TEMP 'gitcred.out'
cmd /v:on /c "> %TEMP%\gitcred.in echo protocol=https&&>> %TEMP%\gitcred.in echo host=github.com&&>> %TEMP%\gitcred.in echo(&git credential fill < %TEMP%\gitcred.in > %TEMP%\gitcred.out"
$token=((Get-Content $outFile | Where-Object { $_ -match '^password=' } | Select-Object -First 1).Substring('password='.Length))
Remove-Item $inFile,$outFile -Force -ErrorAction SilentlyContinue

$headers=@{
  Authorization="Bearer $token"
  Accept='application/vnd.github+json'
  'X-GitHub-Api-Version'='2022-11-28'
  'User-Agent'='SYNO-release-uploader'
}

$releaseBodyObj=[ordered]@{
  tag_name=$tag
  target_commitish='main'
  name="SYNO Parent App APK $tag"
  body='APK build for real Android phone.'
  draft=$false
  prerelease=$true
}
$releaseBody=$releaseBodyObj | ConvertTo-Json -Compress
$release=Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/$repo/releases" -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($releaseBody)) -ContentType 'application/json; charset=utf-8'

$uploadUrl=($release.upload_url -replace '\{\?name,label\}$','') + '?name=' + [uri]::EscapeDataString($assetName)
$uploaded=Invoke-RestMethod -Method Post -Uri $uploadUrl -Headers $headers -ContentType 'application/vnd.android.package-archive' -InFile $apk
$uploaded.browser_download_url
```

## 9. Quy Trình Test Đúng

1. Backend đang chạy và health OK.
2. Collector đang chạy và kết nối AI-X1 OK.
3. Điện thoại cùng mạng với máy backend.
4. Điện thoại cài APK mới.
5. App đã đăng nhập tài khoản phụ huynh.
6. App đã bật quyền thông báo trong Android.
7. Chạy test push:

```bat
cd /d D:\attendance_app_dev
corepack pnpm --filter backend fcm:test-push -- --user-id=2e720f65-7556-4ff7-a062-b91498f1bf2f --title="SYNO test" --body="Test push"
```

8. Chấm công trên máy AI-X1.
9. Quan sát:

- Trong app: lịch sử điểm danh phải cập nhật.
- Trên điện thoại: thanh thông báo phải hiện thông báo điểm danh.

## 10. Lỗi Thường Gặp

### Đăng nhập báo không kết nối máy chủ

Nguyên nhân hay gặp:

- Điện thoại không cùng mạng với máy backend.
- APK build với IP cũ.
- Backend chưa chạy.
- Firewall chặn port 3000.

Kiểm tra trên điện thoại bằng trình duyệt:

```text
http://10.160.45.35:3000/health
```

Nếu không mở được, app cũng không dùng được.

### Chỉ thấy dữ liệu trong app, không thấy notification hệ điều hành

Kiểm tra:

1. Android đã bật thông báo cho SYNO chưa.
2. App đã đăng nhập lại sau khi bật thông báo chưa.
3. `fcm:test-push` có `"mocked": false` chưa.
4. User parent có `fcm_token` trong database chưa.

Kiểm tra token parent:

```powershell
cd /d D:\attendance_app_dev
node -e "require('dotenv').config({path:'backend/.env'}); const {createClient}=require('@supabase/supabase-js'); const s=createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); (async()=>{const {data,error}=await s.from('user_profiles').select('id,full_name,student_code,fcm_token,updated_at').eq('id','2e720f65-7556-4ff7-a062-b91498f1bf2f').single(); if(error) throw error; console.log({full_name:data.full_name, student_code:data.student_code, has_fcm_token:!!data.fcm_token, token_len:data.fcm_token?data.fcm_token.length:0, updated_at:data.updated_at});})();"
```

### Backend báo Firebase Admin not initialized

Thiếu service account hoặc `.env` sai. Quay lại mục 2.

### Máy chấm công không đẩy dữ liệu

Kiểm tra:

```powershell
Test-NetConnection -ComputerName 10.160.45.225 -Port 4370
```

Kiểm tra backend vẫn chạy:

```bat
curl http://10.160.45.35:3000/health
```

Kiểm tra collector còn chạy không:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq 'TestCOMReflect.exe' -or $_.CommandLine -match 'run-collector.ps1' } |
  Select-Object ProcessId,Name,CommandLine
```

## 11. Các Lệnh Verify Trước Khi Đưa APK

Backend:

```bat
cd /d D:\attendance_app_dev
corepack pnpm --filter backend test
```

Flutter:

```bat
cd /d D:\attendance_app_dev\attendance_app
D:\tools\flutter\bin\flutter.bat analyze
D:\tools\flutter\bin\flutter.bat test
```

Build APK:

```bat
cd /d D:\attendance_app_dev\attendance_app
D:\tools\flutter\bin\flutter.bat build apk --release --dart-define=API_BASE_URL=http://10.160.45.35:3000
```

FCM:

```bat
cd /d D:\attendance_app_dev
corepack pnpm --filter backend fcm:test-push -- --user-id=2e720f65-7556-4ff7-a062-b91498f1bf2f --title="SYNO test" --body="Test push"
```

Kết quả FCM bắt buộc:

```json
"mocked": false
```
