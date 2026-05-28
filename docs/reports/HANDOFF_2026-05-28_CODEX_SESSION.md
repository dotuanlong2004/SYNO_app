# HANDOFF 2026-05-28 - Codex Session

File nay dung de bat dau session moi cho du an SYNO. Uu tien doc theo thu tu:

1. `AGENTS.md`
2. `CURRENT_STATUS.md`
3. `PROJECT_MEMORY_SYNO.md`
4. `HUONG_DAN_CHAY_AI_X1.md`
5. `ROADMAP.md`
6. File handoff nay

## Viec Codex da lam trong session gan nhat

### 1. Chuan hoa branding native cho Parent App

Da sua va day code:

- Android app label/icon thanh `SYNO`.
- iOS display name thanh `SYNO`.
- Web title/manifest thanh `SYNO`.
- Windows title/icon thanh `SYNO`.
- Tao icon ung dung tu logo SYNO dung kieu app icon, khong dung logo Flutter.
- Cau hinh `flutter_launcher_icons` trong `attendance_app/pubspec.yaml`.
- Verify:
  - `flutter analyze`: pass.
  - `flutter test`: pass.

Commit da push:

```text
5f011df2 feat: brand parent app native identity
```

### 2. Polish giao dien va text Parent App

Da sua va day code:

- Doi theme app ve tong SYNO: xanh dam, nen sang, mau loi/canh bao dung hop ly.
- Login form:
  - `Email` -> `Dia chi email`.
  - Nut dang nhap letter spacing = 0.
- Man dang ky phu huynh:
  - `Email hoac so dien thoai`.
- Dashboard:
  - Bottom nav `Lich` -> `Lich hoc`.
  - Drawer header dung tong xanh SYNO.
  - Role `PARENT` -> `PHU HUYNH`.
  - Bo cac letterSpacing am/khong can thiet.
- Verify:
  - `flutter analyze`: pass.
  - `flutter test`: pass.

Commit da push:

```text
be7001aa feat: polish parent app brand text
```

### 3. Cai app vao Android emulator

Da lam:

- Mo emulator `Pixel8_API_35`.
- Build debug APK.
- Cai APK vao emulator `emulator-5554`.
- Launch app bang `adb monkey`.

Ket qua lenh cai dat gan nhat:

```text
Performing Streamed Install
Success
```

Luu y: lenh uninstall truoc do co bao `DELETE_FAILED_INTERNAL_ERROR`, nhung lenh install sau do da `Success`. Neu app khong hien o app drawer ngay, kiem tra bang lenh `pm list packages` va launch truc tiep bang `am start` hoac `monkey`.

## Trang thai dang do

Working tree hien co 1 file chua commit:

```text
attendance_app/lib/presentation/pages/dashboard_page.dart
```

Noi dung dang do:

- Them bottom sheet khi bam muc `Truong SYNO` trong tab Ho so.
- Bottom sheet co logo SYNO, tieu de `Thong tin nha truong`, noi dung gioi thieu ket noi diem danh, lich hoc, hoc phi, thong bao.
- Them widget noi bo `_InfoRow`.
- Da verify sau thay doi:
  - `flutter analyze`: pass.
  - `flutter test`: pass.

Can lam tiep o session moi:

1. Mo app tren emulator de nhin bang mat phan Ho so -> `Truong SYNO`.
2. Neu giao dien on, commit/push slice nay.
3. Neu chua on, polish tiep roi chay lai analyze/test.

## Khong duoc quen

- Hardware collector va Firebase push/FCM la phan Codex lam, khong giao Gemini/agent khac.
- Test phan cung that va test push that de cuoi cung, theo lenh user.
- Tat ca text user-facing phai la tieng Viet co dau.
- App Parent va logo/brand la uu tien truoc Admin Web/Super Admin Web.
- Lam toi dau commit/push toi do.
- Khong commit file rac/build output/secret:
  - `bin`
  - `obj`
  - `.dart_tool`
  - `build`
  - `dist`
  - log/cache/temp

## Lenh khoi dong backend

Tu thu muc goc repo:

```bat
cd /d d:\attendance_app_dev
corepack pnpm --filter backend build
corepack pnpm --filter backend start
```

Backend chay cong:

```text
http://localhost:3000
```

Kiem tra nhanh:

```bat
curl http://localhost:3000/health
```

Neu muon dev watch thay vi build/start:

```bat
cd /d d:\attendance_app_dev
corepack pnpm --filter backend dev
```

Luu y:

- `SUPABASE_DB_URL` va FCM credential nam trong `backend/.env`, khong dua secret vao commit.
- Queue da tung duoc xac nhan chay local khi env dung.

## Lenh khoi dong Admin Web

Tu thu muc goc repo:

```bat
cd /d d:\attendance_app_dev
corepack pnpm --filter admin_web dev -- --host 127.0.0.1 --port 5173
```

URL:

```text
http://127.0.0.1:5173
```

Build/typecheck:

```bat
cd /d d:\attendance_app_dev
corepack pnpm --filter admin_web typecheck
corepack pnpm --filter admin_web build
```

## Lenh khoi dong Super Admin Web

Tu thu muc goc repo:

```bat
cd /d d:\attendance_app_dev
corepack pnpm --filter super_admin_web dev
```

URL:

```text
http://127.0.0.1:5174
```

Build/typecheck:

```bat
cd /d d:\attendance_app_dev
corepack pnpm --filter super_admin_web typecheck
corepack pnpm --filter super_admin_web build
```

Tai khoan Super Admin test da duoc ghi trong `CURRENT_STATUS.md`:

```text
superadmin@syno.local / 123456
```

## Lenh khoi dong Android emulator

Xem danh sach emulator:

```bat
cd /d d:\attendance_app_dev\attendance_app
flutter emulators
```

Emulator da dung trong session nay:

```text
Pixel8_API_35
```

Khoi dong emulator:

```bat
cd /d d:\attendance_app_dev\attendance_app
flutter emulators --launch Pixel8_API_35
```

Kiem tra device:

```bat
adb devices
flutter devices
```

Device gan nhat:

```text
emulator-5554
```

## Build, cai va khoi dong Parent App trong emulator

Tu thu muc app:

```bat
cd /d d:\attendance_app_dev\attendance_app
flutter clean
flutter pub get
flutter build apk --debug
adb -s emulator-5554 install -r -d build\app\outputs\flutter-apk\app-debug.apk
adb -s emulator-5554 shell monkey -p com.example.attendance_app -c android.intent.category.LAUNCHER 1
```

Neu can launch truc tiep:

```bat
adb -s emulator-5554 shell am start -n com.example.attendance_app/.MainActivity
```

Neu can kiem tra app da cai:

```bat
adb -s emulator-5554 shell pm list packages | findstr attendance
```

Neu phat trien truc tiep bang Flutter run:

```bat
cd /d d:\attendance_app_dev\attendance_app
flutter run -d emulator-5554
```

Verify Parent App:

```bat
cd /d d:\attendance_app_dev\attendance_app
flutter analyze
flutter test
```

## Lenh git can dung sau moi slice

Kiem tra thay doi:

```bat
cd /d d:\attendance_app_dev
git status --short
git diff
```

Commit/push:

```bat
git add <file-can-commit>
git commit -m "message ngan gon"
git push
```

Truoc khi commit:

- Doc diff bang mat.
- Dam bao khong co build output, secret, cache, file rac.
- Neu co thay doi do user/agent khac tao ma khong lien quan, khong revert.

## Viec nen lam tiep

1. Hoan tat polish Parent App theo roadmap:
   - Ho so/Truong SYNO bottom sheet dang do.
   - Cac trang Hoc phi, Bang diem, Thong bao/Tin tuc can giao dien that, text Viet co dau.
   - Lien ket cac service san co voi UI, tranh dummy neu API da co.
2. Sau Parent App, polish Admin Web:
   - Dashboard quan tri truong.
   - Hoc sinh/lop/hoc phi/diem/lich hoc/thong bao.
3. Sau do polish Super Admin Web:
   - Tenant/school management.
   - Trang thai goi dich vu/module.
4. Codex rieng tiep tuc FCM va hardware collector khi user cho phep vao phan do.

