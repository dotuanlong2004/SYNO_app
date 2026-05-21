# BẮT ĐẦU NGAY - SDK COM Real-time

## Tóm tắt đã làm xong

### ✅ Files đã tạo

| File | Mô tả |
|------|-------|
| `ZKCollector/CollectorService.cs` | Windows Service C# - Real-time + Polling |
| `ZKCollector/Program.cs` | Entry point |
| `ZKCollector/ZKCollector.csproj` | .NET Project file (x86, .NET 4.7.2) |
| `ZKCollector/schema.sql` | Supabase schema (4 bảng) |
| `ZKCollector/INSTALL.bat` | Cài đặt Windows Service |
| `ZKCollector/config.json` | Cấu hình (cần sửa key) |
| `ZKCollector/README.md` | Hướng dẫn |
| `supabase/functions/attendance-collector/index.ts` | Edge Function xử lý Vào/Ra + 10min block |
| `supabase/functions/attendance-collector/deno.json` | Deno config |
| `IMPLEMENTATION_PLAN_SDK.md` | Kế hoạch chi tiết 3 Phase |

---

## BẮT ĐẦU PHASE 0 NGAY (Hôm nay)

### Step 0.1: Sửa config.json (2 phút)

Mở `ZKCollector/config.json`, sửa:
```json
{
  "supabase": {
    "url": "https://bimepdqcwpsynjimvenn.supabase.co",
    "anon_key": "<supabase-anon-key>"  // ← Lấy từ Supabase Studio → Project Settings → API
  }
}
```

Và `CollectorService.cs` dòng 17:
```csharp
private const string SUPABASE_KEY = "<supabase-anon-key>";  // ← Dán key vào đây
```

### Step 0.2: Tạo Schema Supabase (5 phút)

1. Vào https://supabase.com/dashboard/project/bimepdqcwpsynjimvenn
2. SQL Editor → New Query
3. Copy toàn bộ từ `ZKCollector/schema.sql`
4. Run

### Step 0.3: Import 500 học sinh (30 phút)

Chuẩn bị file Excel/CSV:
```
ma_cham_cong | ma_hoc_sinh | ho_ten | lop | sdt_phu_huynh
1            | HS001       | Nguyễn Văn A | 10A1 | 0901234567
2            | HS002       | Trần Thị B   | 10A1 | 0902345678
...
```

Supabase Studio → Table Editor → students → Import CSV

### Step 0.4: Deploy Edge Function (10 phút)

```bash
# Cài Supabase CLI (chỉ 1 lần)
npm install -g supabase

# Login (chỉ 1 lần)
supabase login

# Link project (chỉ 1 lần)
supabase link --project-ref bimepdqcwpsynjimvenn

# Deploy
supabase functions deploy attendance-collector

# Set secret
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

---

## PHASE 1 (Ngày mai)

### Cần chuẩn bị trước

| Item | Lấy từ đâu |
|------|------------|
| **zkemkeeper.dll** | CD/USB đi kèm máy AI-X1 hoặc liên hệ Ronald Jack Vietnam |
| **.NET Framework 4.7.2+** | Nếu chưa có: https://dotnet.microsoft.com/download/dotnet-framework |

### Step 1.1: Copy DLL
```cmd
mkdir C:\ZKCollector
copy zkemkeeper.dll C:\ZKCollector\
```

### Step 1.2: Run INSTALL.bat (Admin)
```cmd
cd D:\attendance_app_dev\ZKCollector
INSTALL.bat
```

### Step 1.3: Test
```cmd
# Xem log
powershell "Get-Content C:\ZKCollector\logs\collector.log -Wait -Tail 20"

# Quét mặt trên máy AI-X1 → phải thấy "REALTIME:" trong log
```

---

## KIỂM TRA KẾT QUẢ

### Trong Supabase
```sql
-- Log hôm nay
SELECT * FROM attendance_logs 
WHERE check_time >= CURRENT_DATE::timestamp
ORDER BY check_time DESC;

-- Số log chưa gửi ZNS
SELECT COUNT(*) FROM attendance_logs WHERE zns_status = 'pending';
```

### Trong ZKCollector log
```
[2025-01-15 08:30:15] ✓ Connected to 192.168.0.225:4370
[2025-01-15 08:30:22] REALTIME: Enroll=5, Time=08:30:22, InOut=0
[2025-01-15 08:30:23] ✓ Edge Function: {"inserted":1,"skipped":0}
```

---

## CÂU HỎI?

**Hỏi tôi**: Bạn đang ở Step nào? Tôi hỗ trợ chi tiết từng bước.

1. ⬜ Đang ở Step 0.1 (sửa config)
2. ⬜ Đang ở Step 0.2 (tạo schema)
3. ⬜ Đang ở Step 0.3 (import học sinh)
4. ⬜ Đang ở Step 0.4 (deploy function)
5. ⬜ Đang ở Phase 1 (cài Windows Service)
