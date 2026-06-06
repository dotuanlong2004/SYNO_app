# IOS INSTALL WITHOUT APP STORE - SYNO

Muc tieu: cai ban iOS de test/noi bo khi chua dua app len App Store cong khai.

Luu y quan trong: iPhone khong cai truc tiep file APK nhu Android. iOS can file `.ipa` da ky bang Apple signing va provisioning hop le.

## Cach khuyen nghi: TestFlight

Phu hop nhat cho test voi phu huynh, nha truong, nhan vien.

Dieu kien:

- Co Apple Developer Program tra phi.
- Tao app tren App Store Connect.
- Build `.ipa` bang Xcode/Flutter.
- Upload len App Store Connect.
- Moi nguoi test cai app TestFlight tren iPhone va nhan invite/link test.

Uu diem:

- Khong can lay UDID tung may.
- De cap nhat ban moi.
- Gan voi flow chinh thong cua Apple.

Gioi han:

- Van phai qua App Store Connect/TestFlight.
- External testing co the can Beta App Review.

## Cach 2: Ad Hoc Distribution

Phu hop khi chi cai cho mot so iPhone cu the.

Dieu kien:

- Co Apple Developer Program tra phi.
- Lay UDID tung iPhone.
- Dang ky thiet bi trong Apple Developer.
- Tao Ad Hoc provisioning profile gom cac UDID do.
- Build `.ipa` voi profile Ad Hoc.
- Cai qua link/MDM/Apple Configurator hoac cong cu phan phoi IPA noi bo.

Uu diem:

- Khong dua len App Store cong khai.
- Khong can nguoi dung vao TestFlight.

Gioi han:

- Phai dang ky truoc tung iPhone.
- Moi khi them may moi phai cap nhat provisioning profile va build lai.

## Cach 3: Apple Business Manager / Custom App

Phu hop khi ban cho truong/to chuc dung rieng nhung van qua he sinh thai Apple.

Dieu kien:

- Truong/to chuc co Apple Business Manager hoac Apple School Manager.
- Developer phan phoi app dang Custom App cho Organization ID cua truong/to chuc.

Uu diem:

- Chuyen nghiep cho khach hang truong hoc.
- Khong hien public tren App Store.

Gioi han:

- Van can Apple review/distribution flow.
- Can thiet lap tai khoan to chuc.

## Cach 4: Enterprise/Internal App

Chi phu hop cho app noi bo cua mot cong ty/to chuc, phan phoi cho nhan vien cua chinh to chuc do.

Khong nen dung de phan phoi app cho khach hang ben ngoai neu khong dung dieu khoan Apple.

## Ve Developer Mode tren iPhone

Bat Developer Mode giup cai/chay app development tu Xcode hoac cong cu dev, nhung khong thay the signing/provisioning. May van can build iOS duoc ky dung tai khoan, certificate va provisioning profile hop le.

## Huong di cho SYNO

Giai doan test nhanh:

1. Dung TestFlight neu can moi nhieu nguoi test.
2. Dung Ad Hoc neu chi co vai iPhone va minh lay duoc UDID.

Giai doan ban cho truong:

1. Uu tien Custom App qua Apple Business Manager/Apple School Manager.
2. Chi dung Enterprise khi do la app noi bo cua mot to chuc du dieu kien.

## Lenh build iOS tham khao

Chay tren macOS co Xcode, Flutter va Apple signing da cau hinh:

```bash
cd attendance_app
flutter clean
flutter pub get
flutter build ipa --release --dart-define=API_BASE_URL=https://api.synoplatform.example
```

Neu build cho may test cuc bo bang Xcode:

```bash
cd attendance_app
open ios/Runner.xcworkspace
```

Trong Xcode:

1. Chon Team Apple Developer.
2. Chon Bundle Identifier dung cua SYNO.
3. Chon thiet bi iPhone da bat Developer Mode.
4. Bam Run hoac Archive tuy kieu cai.

## Tai lieu Apple chinh thuc

- TestFlight: https://developer.apple.com/testflight/
- TestFlight overview: https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/
- Ad Hoc provisioning profile: https://developer.apple.com/help/account/provisioning-profiles/create-an-ad-hoc-provisioning-profile/
- Apple Developer Enterprise Program: https://developer.apple.com/programs/enterprise/
- Custom Apps / Apple Business Manager: https://developer.apple.com/custom-apps/

