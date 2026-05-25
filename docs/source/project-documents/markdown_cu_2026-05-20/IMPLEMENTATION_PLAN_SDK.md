# KẾ HOẠCH TRIỂN KHAI - SDK COM (Real-time)

## PHƯƠNG ÁN: B - SDK COM cho Real-time Push

---

## TỔNG QUAN

| Thành phần | Thông tin |
|------------|-----------|
| **Máy AI-X1** | IP: 192.168.0.225 (SDK port 4370) |
| **Collector** | C# Windows Service trên laptop/PC |
| **Database** | Supabase (PostgreSQL cloud) |
| **Real-time** | `OnAttTransaction` event - push ngay khi quét |
| **Backup** | Polling mỗi 2 phút |

**Kiến trúc**:
```
AI-X1 ──TCP:4370──► Windows (C# ZKCollector Service)
                          │
                          │ HTTP POST
                          ▼
                    Supabase Edge Function
                          │ Logic Vào/Ra + 10min block
                          ▼
                    attendance_logs table
                          │
                          ▼
                    n8n ──► Zalo ZNS
```

---

## PHASE 0: CHUẨN BỊ (1 ngày)

### Mục tiêu
- Database Supabase sẵn sàng
- Schema đúng chuẩn
- Windows PC sẵn sàng

### Checklist Phase 0

| # | Task | Chi tiết | File/Command |
|---|------|----------|--------------|
| 0.1 | **Tạo schema Supabase** | Chạy SQL trong Supabase Studio | `ZKCollector/schema.sql` |
| 0.2 | **Import 500 học sinh** | Nhập từ Excel/CSV vào bảng `students` | Manual hoặc script |
| 0.3 | **Tạo Edge Function** | Deploy function nhận log | `supabase/functions/attendance-collector/` |
| 0.4 | **Kiểm tra Windows** | Đảm bảo Windows 10/11 có .NET 4.7.2+ | `dotnet --version` |
| 0.5 | **Lấy zkemkeeper.dll** | Từ CD/USB Ronald Jack hoặc liên hệ vendor | Copy vào `C:\ZKCollector\` |

### Step-by-Step Phase 0

#### 0.1 Tạo Schema
```sql
-- Vào Supabase Studio → SQL Editor
-- Copy nội dung từ ZKCollector/schema.sql
-- Run
```

#### 0.2 Import học sinh
Format CSV cần có:
```csv
ma_cham_cong,ma_hoc_sinh,ho_ten,lop,sdt_phu_huynh
1,HS001,Nguyễn Văn A,10A1,0901234567
2,HS002,Trần Thị B,10A1,0902345678
...
```

Vào Supabase Studio → Table Editor → students → Import CSV

#### 0.3 Deploy Edge Function
```bash
# Cài Supabase CLI (nếu chưa có)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref bimepdqcwpsynjimvenn

# Deploy function
supabase functions deploy attendance-collector

# Set secrets
supabase secrets set SUPABASE_URL=https://bimepdqcwpsynjimvenn.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

#### 0.4 Kiểm tra Windows
```cmd
# Kiểm tra .NET Framework
reg query "HKLM\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" /v Release
# Giá trị >= 461808 là OK

# Kiểm tra port 4370 không bị chặn
Test-NetConnection -ComputerName 192.168.0.225 -Port 4370
```

---

## PHASE 1: CÀI SDK & TEST (1 ngày)

### Mục tiêu
- zkemkeeper.dll hoạt động
- Kết nối được AI-X1
- Đọc được log thực tế

### Checklist Phase 1

| # | Task | Chi tiết | File |
|---|------|----------|------|
| 1.1 | **Đăng ký COM DLL** | `regsvr32 zkemkeeper.dll` | Run as Admin |
| 1.2 | **Build ZKCollector** | `dotnet build` | `ZKCollector.csproj` |
| 1.3 | **Test console mode** | Chạy không cài service | `ZKCollector.exe --console` |
| 1.4 | **Verify kết nối** | Phải thấy "Connected" và log | Console output |
| 1.5 | **Test realtime event** | Quét mặt → phải thấy "REALTIME:" | Console output |
| 1.6 | **Kiểm tra Supabase** | Log phải xuất hiện trong table | Supabase Studio |

### Step-by-Step Phase 1

#### 1.1 Đăng ký COM (Run as Administrator)
```cmd
# Copy zkemkeeper.dll vào C:\ZKCollector\ trước
cd C:\ZKCollector\
regsvr32 zkemkeeper.dll
# Phải thấy: "DllRegisterServer in zkemkeeper.dll succeeded"
```

#### 1.2 Build Project
```cmd
cd D:\attendance_app_dev\ZKCollector
dotnet build -c Release

# Output: bin\Release\net472\ZKCollector.exe
```

#### 1.3 Test Console Mode
```cmd
cd C:\ZKCollector
bin\Release\net472\ZKCollector.exe --console

# Expected output:
# === ZKCollector Service Starting ===
# Device: 192.168.0.225:4370
# ✓ zkemkeeper COM object initialized
# ✓ Real-time event registered
# ✓ Connected to 192.168.0.225:4370
# REALTIME: Enroll=1, Time=08:30:15, InOut=0
# ✓ Pushed 1 logs to Supabase
```

#### 1.4 Verify trong Supabase
Vào Supabase Studio → Table Editor → `attendance_logs`
- Phải thấy record vừa insert
- `in_or_out` = "Vào" (lần đầu)
- `zns_status` = "pending"

---

## PHASE 2: CÀI SERVICE & CHẠY (1 ngày)

### Mục tiêu
- Windows Service chạy ổn định
- Real-time + Polling hoạt động
- Tự động reconnect

### Checklist Phase 2

| # | Task | Chi tiết | Command |
|---|------|----------|---------|
| 2.1 | **Cài Windows Service** | Chạy INSTALL.bat | `ZKCollector/INSTALL.bat` |
| 2.2 | **Kiểm tra Service** | Đảm bảo status = Running | `sc query ZKCollector` |
| 2.3 | **Test reboot** | Restart PC → Service tự động chạy | `shutdown /r /t 0` |
| 2.4 | **Monitor logs** | Xem log realtime | `Get-Content logs\collector.log -Wait -Tail 20` |
| 2.5 | **Test 1 ngày** | Chạy 1 ngày, kiểm tra số log | So sánh với máy |
| 2.6 | **Giữ HTTP backup** | Để `zk_agent/main.py --realtime` dự phòng | Chạy song song nếu cần |

### Step-by-Step Phase 2

#### 2.1 Cài Service (Run as Administrator)
```cmd
cd D:\attendance_app_dev\ZKCollector
INSTALL.bat
```

#### 2.2 Kiểm tra
```cmd
sc query ZKCollector
# STATE phải là: RUNNING

# Xem log
powershell "Get-Content C:\ZKCollector\logs\collector.log -Wait -Tail 20"
```

#### 2.3 Các lệnh quản lý
```cmd
# Stop
sc stop ZKCollector

# Start
sc start ZKCollector

# Uninstall
sc stop ZKCollector
sc delete ZKCollector

# Kiểm tra lỗi
type C:\ZKCollector\logs\collector.log
```

---

## PHASE 3: KẾT NỐI N8N & ZALO (1 ngày)

### Mục tiêu
- n8n đọc từ Supabase
- Gửi ZNS thành công
- Hoàn thành hệ thống

### Checklist Phase 3

| # | Task | Chi tiết | Query |
|---|------|----------|-------|
| 3.1 | **Tạo n8n workflow** | Node: Postgres → Zalo ZNS | n8n interface |
| 3.2 | **Query lấy log pending** | SELECT từ attendance_logs | See below |
| 3.3 | **UPDATE sau gửi** | Set zns_status='sent' | See below |
| 3.4 | **Test ZNS** | 1 phụ huynh nhận được tin | Check Zalo |
| 3.5 | **Cron n8n** | Chạy mỗi 1 phút | n8n trigger |
| 3.6 | **Backup Supabase** | pg_dump hàng ngày | Cron job |

### Query cho n8n

#### Lấy log chưa gửi (SELECT)
```sql
SELECT 
  al.id AS log_id,
  al.in_or_out,
  al.check_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh' AS gio_cham_vn,
  s.ho_ten,
  s.lop,
  s.sdt_phu_huynh,
  s.zalo_user_id
FROM attendance_logs al
JOIN students s ON s.ma_cham_cong = al.ma_cham_cong
WHERE al.zns_status = 'pending'
  AND al.check_time > NOW() - INTERVAL '2 hours'
  AND s.sdt_phu_huynh IS NOT NULL
ORDER BY al.check_time ASC
LIMIT 50;
```

#### UPDATE sau gửi thành công
```sql
UPDATE attendance_logs
SET 
  zns_status = 'sent',
  zns_sent_at = NOW(),
  zns_msg_id = '{{msg_id}}',
  zns_retry_count = 0
WHERE id = {{log_id}};
```

#### UPDATE nếu gửi thất bại
```sql
UPDATE attendance_logs
SET 
  zns_status = CASE WHEN zns_retry_count >= 3 THEN 'failed' ELSE 'pending' END,
  zns_error = '{{error_message}}',
  zns_retry_count = zns_retry_count + 1
WHERE id = {{log_id}};
```

---

## CẤU TRÚC THƯ MỤC

```
attendance_app_dev/
├── ZKCollector/                    # C# Windows Service
│   ├── ZKCollector.csproj         # Project file
│   ├── CollectorService.cs        # Main service logic
│   ├── Program.cs                 # Entry point
│   ├── config.json                # Configuration
│   ├── schema.sql                 # Supabase schema
│   ├── INSTALL.bat                # Service installer
│   ├── README.md                  # Documentation
│   └── logs/                      # Log files (runtime)
├── supabase/
│   └── functions/
│       └── attendance-collector/  # Edge Function
│           ├── index.ts           # Main function
│           └── deno.json          # Config
├── zk-agent/                      # HTTP Backup (giữ nguyên)
│   └── ...
├── IMPLEMENTATION_PLAN_SDK.md     # This file
└── IMPLEMENTATION_PLAN_REAL.md    # Phương án A (HTTP)
```

---

## TROUBLESHOOTING

| Vấn đề | Nguyên nhân | Cách fix |
|--------|-------------|----------|
| "Error -2" | MITA Pro hoặc app khác đang giữ port 4370 | Đóng MITA Pro |
| "COM object failed" | Chưa regsvr32 hoặc sai .NET | Run INSTALL.bat as Admin |
| "Service won't start" | Thiếu .NET 4.7.2 | Cài .NET Framework |
| "Push failed" | Edge Function chưa deploy hoặc sai key | Check config.json |
| "Log không vào DB" | Logic chặn 10 phút hoặc duplicate | Kiểm tra diff time |
| "Real-time không chạy" | Sự kiện chưa đăng ký | Restart service |

---

## BẮT ĐẦU

**Ready? Bắt đầu Phase 0 ngay → Task 0.1: Tạo schema Supabase**

Chạy file `ZKCollector/schema.sql` trong Supabase SQL Editor.
