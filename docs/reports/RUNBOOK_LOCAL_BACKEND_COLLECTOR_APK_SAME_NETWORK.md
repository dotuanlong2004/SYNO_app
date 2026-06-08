# RUNBOOK - Local Backend, AI-X1 Collector, APK Same Network

Ngay cap nhat: 2026-06-08

Muc tieu: Chay SYNO ban local tren laptop, ket noi may cham cong Ronald Jack AI-X1, va dung APK tren dien thoai cung mang voi backend.

## 1. Nguyen tac ket noi

Luong local hien tai:

```text
May cham cong AI-X1 -> Laptop chay collector/backend -> Supabase/Firebase -> Dien thoai cai APK
```

Dien thoai khong can cung mang truc tiep voi may cham cong. Dien thoai chi can:

- Goi duoc backend tren laptop qua IP LAN.
- Co internet/Google Play Services de nhan Firebase push.
- Da cai APK build dung `API_BASE_URL`.
- Da dang nhap tai khoan phu huynh va bat quyen thong bao.

Laptop can:

- Ket noi duoc may cham cong `10.160.45.225:4370`.
- Chay backend port `3000`.
- Chay collector AI-X1.

## 2. IP hien tai

Backend laptop hien tai:

```text
http://10.160.45.35:3000
```

May cham cong AI-X1 hien tai:

```text
10.160.45.225:4370
```

Neu IP laptop doi, APK local build voi IP cu se khong dung duoc. Can build lai APK bang IP moi, tru khi da chuyen sang server/domain co dinh.

## 3. Kiem tra IP laptop

Chay PowerShell:

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object IPAddress,InterfaceAlias,AddressState
```

Can thay IP Wi-Fi, vi du:

```text
10.160.45.35
```

## 4. Kiem tra laptop ket noi duoc may cham cong

```powershell
ping 10.160.45.225
Test-NetConnection 10.160.45.225 -Port 4370
```

Ket qua dung:

```text
TcpTestSucceeded : True
```

Neu ping duoc nhung port 4370 fail:

- Kiem tra may cham cong co dang bat khong.
- Kiem tra port tren may cham cong co phai `4370` khong.
- Kiem tra co collector khac dang giu ket noi khong.
- Cho 10-30 giay roi chay lai collector.

## 5. Mo backend

Terminal 1:

```bat
cd /d D:\attendance_app_dev
corepack pnpm --filter backend build
corepack pnpm --filter backend start
```

Backend dung khi thay:

```text
Attendance API listening on port 3000
Hardware scan: POST /api/v1/hardware/scan
```

Kiem tra health:

```powershell
Invoke-RestMethod http://localhost:3000/health
Invoke-RestMethod http://10.160.45.35:3000/health
```

Ket qua mong muon:

```json
{"ok":true,"supabase":"up"}
```

## 6. Firewall port 3000

Neu dien thoai cung Wi-Fi nhung khong vao duoc backend, mo firewall:

```powershell
New-NetFirewallRule -DisplayName "SYNO Backend 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

Kiem tra tren dien thoai bang trinh duyet:

```text
http://10.160.45.35:3000/health
```

Neu dien thoai mo duoc JSON health thi app co the goi backend.

## 7. Build APK local cho dien thoai cung mang

Neu backend laptop la `10.160.45.35`:

```bat
cd /d D:\attendance_app_dev\attendance_app
set ANDROID_SDK_ROOT=D:\Sdk
set ANDROID_HOME=D:\Sdk
D:\tools\flutter\bin\flutter.bat build apk --release --dart-define=API_BASE_URL=http://10.160.45.35:3000
```

APK nam tai:

```text
D:\attendance_app_dev\attendance_app\build\app\outputs\flutter-apk\app-release.apk
```

Neu IP laptop doi, thay `10.160.45.35` bang IP moi va build lai.

## 8. Cai APK tren dien thoai

Tren dien thoai:

1. Go app SYNO cu.
2. Cai APK moi.
3. Mo app.
4. Dang nhap tai khoan phu huynh.
5. Cho phep quyen thong bao.

Tai khoan test hien tai:

```text
long.parent@test.com / 123456
hoa.parent@test.com / 123456
```

Kiem tra quyen thong bao:

```text
Cai dat dien thoai -> Ung dung -> SYNO -> Thong bao -> Bat
```

## 9. Chay collector AI-X1

Terminal 2:

```powershell
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File D:\attendance_app_dev\hardware-collector\ronald-jack-aix1\run-collector.ps1
```

Collector dung khi thay:

```text
Thiet bi: 10.160.45.225:4370
Backend: http://localhost:3000/api/v1/hardware/scan
OpenCommPort ... THANH CONG
SN=AYTD01032550
REAL-TIME - Polling 3s
Dang theo doi...
```

Khong dong terminal collector khi dang test cham cong.

## 10. Kiem tra Firebase push that

Sau khi app da dang nhap va gui FCM token len backend, test push:

```bat
cd /d D:\attendance_app_dev
corepack pnpm --filter backend fcm:test-push -- --user-id=2e720f65-7556-4ff7-a062-b91498f1bf2f --title="Thong bao SYNO" --body="Kiem tra thong bao thiet bi tu SYNO."
```

Ket qua dung:

```json
"mocked": false
```

Neu `has no fcm_token` hoac dien thoai khong hien:

- Dang nhap tai khoan do tren chinh dien thoai can nhan.
- Bat quyen thong bao.
- Dam bao dien thoai co internet/Google Play Services.
- Dang xuat/dang nhap lai de app gui token moi.

## 11. Test cham cong that

Khi backend va collector dang chay:

1. Cham cong tren AI-X1 bang ma da lien ket.
2. Collector phat hien log moi.
3. Backend ghi attendance.
4. Firebase gui push.
5. App phu huynh nhan thong bao.
6. Man `Tong quan` va `Lich su` co du lieu moi.

Ma test hien tai:

```text
ma_cham_cong=1 -> HS0085 -> Long -> long.parent@test.com
ma_cham_cong=2 -> HS0086 -> Hoa -> hoa.parent@test.com
```

## 12. Ghi nho ve doi mang

Neu chi may cham cong doi IP:

- App khong can build lai.
- Collector can biet IP moi.
- Hien tai sua trong `hardware-collector/ronald-jack-aix1/collector-config.json`.
- Sau nay nen sua tren Web Admin va collector tu lay config tu server.

Neu laptop/backend doi IP:

- APK local build voi IP cu se loi ket noi.
- Can build lai APK voi IP moi.

Neu backend da dua len domain co dinh:

- App khong can build lai khi doi mang noi bo.
- Collector tai truong chi can ra internet va ket noi duoc may cham cong trong LAN.
