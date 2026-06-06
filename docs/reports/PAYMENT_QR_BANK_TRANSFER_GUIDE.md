# SYNO - Huong Dan Thanh Toan QR Chuyen Khoan

Ngay cap nhat: 2026-06-06

Tai lieu nay ghi cach chay luong thanh toan hoc phi bang QR trong ban hien tai.

## Nguyen tac an toan

- App phu huynh chi hien ma QR, so tien va noi dung chuyen khoan.
- App phu huynh khong duoc tu danh dau "Da thanh toan".
- Web Admin co nut "Gia lap nhan tien" chi de kiem thu noi bo.
- Khi chay that, trang thai thanh toan chi duoc cap nhat sau khi ngan hang hoac nhan vien nha truong doi soat thanh cong.
- Noi dung chuyen khoan phai giu dung mau: `SYNO {ma_hoc_sinh} HP{fee_id}`.

## Cau hinh tai khoan nhan tien

Them cac bien sau vao `backend/.env`, sau do restart backend:

```env
SYNO_PAYMENT_BANK_BIN=
SYNO_PAYMENT_ACCOUNT_NO=
SYNO_PAYMENT_ACCOUNT_NAME=
```

Y nghia:

- `SYNO_PAYMENT_BANK_BIN`: ma ngan hang dung de tao VietQR.
- `SYNO_PAYMENT_ACCOUNT_NO`: so tai khoan nhan tien cua nha truong.
- `SYNO_PAYMENT_ACCOUNT_NAME`: ten chu tai khoan.

Neu thieu mot trong cac bien tren, app se hien thong bao:

```text
Nha truong chua cau hinh tai khoan nhan chuyen khoan.
```

## API app phu huynh

Lay QR cho mot khoan thu:

```http
GET /api/v1/fees/:id/payment-qr
Authorization: Bearer <parent_access_token>
```

Backend se kiem tra:

- Tai khoan phu huynh da dang nhap.
- Khoan thu cung `school_id`.
- Phu huynh chi xem duoc khoan thu cua hoc sinh dang lien ket.
- Khoan thu chua o trang thai `paid`.
- So tien phai lon hon 0.

Phan hoi khi da cau hinh ngan hang:

```json
{
  "ok": true,
  "data": {
    "configured": true,
    "account_no": "SO_TAI_KHOAN",
    "account_name": "TEN_TAI_KHOAN",
    "amount": 2200000,
    "add_info": "SYNO HS0085 HP4",
    "qr_url": "https://img.vietqr.io/image/..."
  }
}
```

## Gia lap thanh toan tren Web Admin

Endpoint kiem thu:

```http
POST /api/v1/admin-web/fees/:id/simulate-payment
Authorization: Bearer <school_admin_access_token>
Content-Type: application/json

{
  "received_amount": 2200000
}
```

Backend se:

- Kiem tra khoan thu thuoc dung `school_id` cua admin truong.
- Tu choi neu khoan thu da `paid`.
- Chi cho qua neu `received_amount` khop chinh xac `total_amount`.
- Cap nhat `payment_status = paid`, `payment_method = online`, `paid_at = now`.

Khong dung endpoint nay lam doi soat ngan hang that.

## Khi lam thanh toan that

Truoc khi dua vao san xuat, can them mot trong cac luong sau:

1. Webhook ngan hang co chu ky xac thuc.
2. API doi soat ngan hang co token rieng va IP allowlist neu ngan hang ho tro.
3. File sao ke doi soat thu cong co log nguoi thao tac.

Moi giao dich that can kiem tra toi thieu:

- Ma truong / tai khoan nhan tien dung.
- So tien nhan duoc khop chinh xac.
- Noi dung chuyen khoan khop `SYNO {ma_hoc_sinh} HP{fee_id}`.
- Khoan thu chua duoc ghi nhan thanh toan truoc do.
- Co audit log: thoi gian, nguoi/nguon xac nhan, ma giao dich ngan hang, ket qua.

Khong cap nhat trang thai thanh toan chi dua tren viec app da hien QR.

## Lenh verify nhanh

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

Build APK cho dien thoai cung mang LAN:

```bat
cd /d d:\attendance_app_dev\attendance_app
D:\tools\flutter\bin\flutter.bat build apk --release --dart-define=API_BASE_URL=http://10.160.45.35:3000
```
