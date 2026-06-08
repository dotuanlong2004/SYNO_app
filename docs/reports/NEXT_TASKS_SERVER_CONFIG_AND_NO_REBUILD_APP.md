# NEXT TASKS - Server Config And No-Rebuild Parent App

Ngay cap nhat: 2026-06-08

Muc tieu: Dua SYNO sang mo hinh server/domain co dinh de app phu huynh khong phai build lai khi doi mang, dong thoi cho Web Admin cau hinh may cham cong ma khong dung vao code.

## 1. Ket luan kien truc can lam

Hien tai APK local dang build theo IP laptop, vi du:

```text
http://10.160.45.35:3000
```

Neu laptop/backend doi IP thi APK local phai build lai. De khong build lai app, can:

```text
App phu huynh -> https://api.syno.vn
Collector tai truong -> https://api.syno.vn
May cham cong -> chi can collector tai truong ket noi duoc
```

App phu huynh khong can biet IP may cham cong. Khi may cham cong doi IP, app khong can build lai. Chi can collector biet IP moi.

## 2. Viec can lam cho backend/server

- [ ] Deploy backend len server co domain co dinh, vi du `https://api.syno.vn`.
- [ ] Cau hinh HTTPS hop le.
- [ ] Cau hinh CORS cho Web Admin va Super Admin domain.
- [ ] Cau hinh Firebase Admin credential tren server.
- [ ] Cau hinh Supabase env tren server.
- [ ] Dam bao `/health` tra ve:

```json
{"ok":true,"supabase":"up"}
```

- [ ] Them monitoring/log de biet push notification thanh cong hay that bai.

## 3. Viec can lam cho Parent App

- [ ] Build APK/App Store build bang domain co dinh:

```text
API_BASE_URL=https://api.syno.vn
```

- [ ] Khong build app bang IP laptop nua khi chay production.
- [ ] Khi doi Wi-Fi, doi IP may cham cong, doi IP noi bo truong: khong build lai app.
- [ ] App chi can internet de goi server va nhan Firebase push.

## 4. Viec can lam cho Web Admin

Them muc cau hinh may cham cong trong Web Admin nha truong:

```text
Cai dat truong -> May cham cong
```

Thong tin can cho phep admin truong sua:

- Ten thiet bi
- IP may cham cong
- Port
- Machine number
- Comm password neu co
- Polling interval
- Trang thai bat/tat
- Nut "Kiem tra ket noi"
- Nut "Luu cau hinh"

Luu y quan trong:

- Backend server tren internet thuong khong ket noi truc tiep duoc may cham cong trong LAN cua truong.
- Nut "Kiem tra ket noi" tot nhat do collector tai truong thuc hien roi bao ket qua ve server.
- Khong de Web Admin goi truc tiep IP LAN cua may cham cong tu browser.

## 5. Viec can lam cho Collector

Collector tai truong can doi sang doc cau hinh tu server:

```text
Collector -> GET https://api.syno.vn/api/v1/collector/config
```

Sau do dung cau hinh do de ket noi may cham cong:

```text
AI_X1_DEVICE_IP
AI_X1_DEVICE_PORT
AI_X1_MACHINE_NUMBER
AI_X1_COMM_PASSWORD
AI_X1_POLL_MS
```

Collector van can mot cau hinh cuc bo toi thieu khi cai dat:

```json
{
  "BACKEND_BASE_URL": "https://api.syno.vn",
  "SCHOOL_ID": "1",
  "COLLECTOR_TOKEN": "secret-per-school-or-device"
}
```

Sau khi cai dat mot lan, doi IP may cham cong thi admin sua tren Web Admin, collector tu lay config moi. Khong sua code.

## 6. Database/schema can them

Can tao bang cau hinh thiet bi theo truong, vi du:

```sql
create table public.school_devices (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references public.schools(id),
  device_name text not null,
  device_type text not null default 'ronald_jack_ai_x1',
  device_ip text not null,
  device_port integer not null default 4370,
  machine_number integer not null default 1,
  comm_password integer not null default 0,
  poll_ms integer not null default 3000,
  enabled boolean not null default true,
  last_seen_at timestamptz,
  last_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Bat buoc:

- GRANT ro rang.
- RLS enabled.
- Policy school-scoped theo `school_id`.
- Khong expose secret/token sang frontend.

## 7. API can them

Cho Web Admin:

```http
GET /api/v1/admin-web/devices
POST /api/v1/admin-web/devices
PUT /api/v1/admin-web/devices/:id
POST /api/v1/admin-web/devices/:id/test-request
```

Cho collector:

```http
GET /api/v1/collector/config
POST /api/v1/collector/status
POST /api/v1/hardware/scan
```

Collector API phai xac thuc bang token rieng. Khong dung token user/admin cho collector.

## 8. Dieu can dam bao

- Doi IP may cham cong: sua Web Admin, khong build lai app.
- Doi Wi-Fi truong: neu collector va may cham cong van cung LAN va collector ra internet duoc thi app khong anh huong.
- Doi IP laptop local: chi anh huong ban dev local; production dung domain thi khong anh huong.
- Doi backend server/domain: can build lai app neu domain trong app thay doi. Vi vay production phai chon domain co dinh tu dau.

## 9. Test plan cho lat cat nay

- [ ] Backend test:

```bat
cd /d D:\attendance_app_dev
corepack pnpm --filter backend test
```

- [ ] Web Admin build:

```bat
cd /d D:\attendance_app_dev
corepack pnpm --filter admin_web build
```

- [ ] Collector build:

```bat
dotnet build D:\attendance_app_dev\hardware-collector\ronald-jack-aix1 -c Release
```

- [ ] Test doi IP may cham cong trong Web Admin:
  - Sua IP/port.
  - Collector nhan config moi.
  - Collector ket noi lai.
  - Cham cong tao attendance log.
  - App phu huynh nhan notification.

## 10. Uu tien thuc hien

1. Tao DB/API luu cau hinh thiet bi theo truong.
2. Them UI Web Admin `Cai dat truong -> May cham cong`.
3. Sua collector de lay config tu backend.
4. Them collector status/heartbeat.
5. Deploy backend len domain co dinh.
6. Build app bang domain co dinh.
