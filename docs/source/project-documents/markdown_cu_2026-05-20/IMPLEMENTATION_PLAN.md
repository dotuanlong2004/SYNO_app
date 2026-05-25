# KẾ HOẠCH TRIỂN KHAI - MITA → SDK

## TỔNG QUAN

- **HTTP API hiện tại**: Giữ nguyên làm backup/fallback
- **SDK COM mới**: Xây dựng theo đúng migration plan v2
- **Thứ tự**: Phase 0 → 1 → 2 → 3 (hoàn thành 100% mới qua phase tiếp)

---

## PHASE 0: CHUẨN BỊ HẠ TẦNG & DATABASE (Ngày 1-2)

### Mục tiêu
- PostgreSQL sẵn sàng
- Học sinh đã import đầy đủ
- Windows Server đã sẵn sàng cài SDK

### Checklist Phase 0

| # | Task | Lệnh/Chi tiết | Trạng thái |
|---|------|---------------|------------|
| 0.1 | **BACKUP SQL Server MITACOSQL** | `BACKUP DATABASE MITACOSQL TO DISK='C:\Backup\MITACOSQL_$(date).bak'` | ⬜ |
| 0.2 | **Kiểm tra UserEnable** | `SELECT DISTINCT UserEnable, COUNT(*) FROM NHANVIEN GROUP BY UserEnable` | ⬜ |
| 0.3 | **Export học sinh từ MITA** | Query SQL Server → CSV | ⬜ |
| 0.4 | **Tạo schema PostgreSQL** | 4 bảng: students, attendance_logs, collector_state, zalo_tokens | ⬜ |
| 0.5 | **Import học sinh** | CSV → PostgreSQL students | ⬜ |
| 0.6 | **Verify import** | `SELECT COUNT(*) FROM students` phải khớp MITA | ⬜ |
| 0.7 | **Kiểm tra Windows Server** | Ping 10.1.1.119, Test-NetConnection port 4370 | ⬜ |
| 0.8 | **Mở port Windows Firewall** | `netsh advfirewall firewall add rule name="ZKTeco-AI-X1" dir=in action=allow protocol=TCP localport=4370` | ⬜ |

### Schema PostgreSQL cần tạo

```sql
-- Bảng students (map từ NHANVIEN + PHONGBAN)
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    ma_cham_cong INTEGER UNIQUE NOT NULL,  -- EnrollNumber trên máy
    ma_hoc_sinh VARCHAR(20),
    ho_ten VARCHAR(100),
    ma_lop CHAR(7),
    lop VARCHAR(50),
    sdt_phu_huynh VARCHAR(20),
    zalo_user_id VARCHAR(50),
    zns_template_id VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bảng attendance_logs (thay cho NhanVienChamCong)
CREATE TABLE attendance_logs (
    id SERIAL PRIMARY KEY,
    ma_cham_cong INTEGER REFERENCES students(ma_cham_cong),
    check_time TIMESTAMP WITH TIME ZONE NOT NULL,
    in_or_out VARCHAR(10) CHECK (in_or_out IN ('Vào', 'Ra')),
    verify_mode INTEGER,
    device_ip VARCHAR(15),
    raw_payload JSONB,
    -- ZNS tracking
    zns_status VARCHAR(20) DEFAULT 'pending' CHECK (zns_status IN ('pending', 'sent', 'failed')),
    zns_sent_at TIMESTAMP,
    zns_msg_id VARCHAR(100),
    zns_retry_count INTEGER DEFAULT 0,
    zns_error TEXT,
    -- Constraint chặn duplicate
    CONSTRAINT uq_checkin UNIQUE (ma_cham_cong, check_time)
);

-- Bảng collector_state (theo dõi Windows Service)
CREATE TABLE collector_state (
    device_ip VARCHAR(15) PRIMARY KEY,
    last_pull_time TIMESTAMP,
    last_seen TIMESTAMP,
    status VARCHAR(20) DEFAULT 'offline',
    error_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bảng zalo_tokens (giữ nguyên logic n8n)
CREATE TABLE zalo_tokens (
    id SERIAL PRIMARY KEY,
    token_type VARCHAR(20) DEFAULT 'oa_access_token',
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## PHASE 1: CÀI SDK & TEST KẾT NỐI (Ngày 3-5)

### Mục tiêu
- zkemkeeper.dll hoạt động
- Đọc được log thực tế từ AI-X1
- Xác nhận MaChamCong = UserID từ SDK

### Checklist Phase 1

| # | Task | Chi tiết | Trạng thái |
|---|------|----------|------------|
| 1.1 | **Tìm zkemkeeper.dll** | Từ MITA hoặc CD/USB hoặc liên hệ Ronald Jack | ⬜ |
| 1.2 | **Tạo thư mục** | `C:\ZKCollector\` và `C:\ZKCollector\logs\` | ⬜ |
| 1.3 | **Copy DLL** | Copy zkemkeeper.dll vào C:\ZKCollector\ | ⬜ |
| 1.4 | **Đăng ký COM** | `regsvr32 C:\ZKCollector\zkemkeeper.dll` → phải thấy 'succeeded' | ⬜ |
| 1.5 | **Kiểm tra .NET** | `reg query "HKLM\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" /v Release` >= 461808 | ⬜ |
| 1.6 | **Cài .NET SDK 6.0** | Tải từ https://dotnet.microsoft.com/download/dotnet/6.0 | ⬜ |
| 1.7 | **Tạo project C# Test** | `dotnet new console -n TestConnect --framework net472` | ⬜ |
| 1.8 | **Sửa .csproj x86** | Thêm `<PlatformTarget>x86</PlatformTarget>` và COMReference | ⬜ |
| 1.9 | **Viết Program.cs** | Test kết nối 10.1.1.119:4370, đọc log 3 ngày | ⬜ |
| 1.10 | **Build & Run** | `dotnet build && dotnet run` | ⬜ |
| 1.11 | **Xác nhận MaChamCong** | So sánh UserID từ SDK với MaChamCong trong MITA | ⬜ |

### Lưu ý quan trọng Phase 1

**Error -2 = Máy bận**: Nếu MITA đang chạy và giữ port 4370, phải đóng MITA trước khi test.

**COM STA Thread**: C# code PHẢI có `[STAThread]` và dùng `lock` khi gọi SDK.

---

## PHASE 2: BACKEND API + COLLECTOR SERVICE (Ngày 6-10)

### Mục tiêu
- Node.js API hoạt động trên VPS
- C# Windows Service chạy ổn định
- Logic Vào/Ra + chặn 10 phút hoạt động đúng
- Chạy song song 3 ngày, so sánh kết quả với MITA

### Checklist Phase 2

| # | Task | Chi tiết | Trạng thái |
|---|------|----------|------------|
| 2.1 | **Setup Node.js API** | VPS: `mkdir /opt/attendance-api && npm init -y` | ⬜ |
| 2.2 | **Install dependencies** | `npm install express pg dotenv` | ⬜ |
| 2.3 | **Tạo app.js** | API với endpoint POST /api/v2/attendance | ⬜ |
| 2.4 | **Logic Vào/Ra** | Hàm `determineInOrOut()` xen kẽ + chặn 10 phút | ⬜ |
| 2.5 | **Auth middleware** | Bearer Token xác thực | ⬜ |
| 2.6 | **Nginx + SSL** | Reverse proxy HTTPS | ⬜ |
| 2.7 | **Tạo CollectorService.cs** | Windows Service hoàn chỉnh | ⬜ |
| 2.8 | **Implement Realtime event** | `OnAttTransaction` push ngay khi quét | ⬜ |
| 2.9 | **Implement Polling** | Timer 2 phút backup | ⬜ |
| 2.10 | **Lưu last_pull_time** | File `C:\ZKCollector\last_pull.txt` | ⬜ |
| 2.11 | **Build Service** | `dotnet build -c Release` | ⬜ |
| 2.12 | **Install Service** | `sc create ZKCollector binPath=... start= auto` | ⬜ |
| 2.13 | **Start Service** | `sc start ZKCollector` | ⬜ |
| 2.14 | **Test song song** | Chạy 3 ngày, so sánh log MITA vs SDK | ⬜ |
| 2.15 | **Script so sánh** | Query đếm log 2 nguồn, chênh lệch < 5% | ⬜ |

### Logic Vào/Ra cần implement (giống trigger MITA)

```csharp
// Pseudo-code cho determineInOrOut
async Task<string> determineInOrOut(int maChamCong, DateTime checkTime) {
    // Lấy log cuối cùng trong ngày của học sinh này
    var lastLog = await db.Query(
        "SELECT in_or_out, check_time FROM attendance_logs " +
        "WHERE ma_cham_cong = $1 AND DATE(check_time) = DATE($2) " +
        "ORDER BY check_time DESC LIMIT 1",
        maChamCong, checkTime
    );
    
    if (lastLog == null) return "Vào"; // Lần đầu trong ngày
    
    // Chặn quẹt liên tiếp < 10 phút
    var diffMin = (checkTime - lastLog.check_time).TotalMinutes;
    if (diffMin < 10) return null; // Bỏ qua
    
    // Xen kẽ Vào/Ra
    return lastLog.in_or_out == "Vào" ? "Ra" : "Vào";
}
```

---

## PHASE 3: CHUYỂN N8N + TẮT MITA PRO (Ngày 11-14)

### Mục tiêu
- n8n workflow mới đọc từ PostgreSQL
- ZNS gửi thành công từ schema mới
- Tắt MITA Pro an toàn
- Theo dõi 1 ngày ổn định

### Checklist Phase 3

| # | Task | Chi tiết | Trạng thái |
|---|------|----------|------------|
| 3.1 | **Backup lần cuối** | SQL Server MITACOSQL | ⬜ |
| 3.2 | **Kiểm tra Task Scheduler** | `taskschd.msc` - không có task tự start MITA | ⬜ |
| 3.3 | **Test n8n workflow mới** | Gửi ZNS thành công 1 lần | ⬜ |
| 3.4 | **Kết nối PostgreSQL** | Thêm Postgres node vào n8n | ⬜ |
| 3.5 | **Query mới cho n8n** | SELECT FROM attendance_logs JOIN students | ⬜ |
| 3.6 | **UPDATE zns_status** | Sau gửi thành công: UPDATE zns_status='sent' | ⬜ |
| 3.7 | **Đóng MITA Pro** | Task Manager: end process | ⬜ |
| 3.8 | **Rename MITAPro.exe** | Đổi tên thành MITAPro.exe.disabled | ⬜ |
| 3.9 | **Collector kết nối độc quyền** | Log: 'Connected to 10.1.1.119' | ⬜ |
| 3.10 | **Theo dõi 1 ngày** | ZNS gửi bình thường, attendance_logs có data | ⬜ |
| 3.11 | **Setup cron backup** | `pg_dump` hàng ngày trên VPS | ⬜ |

---

## THEO DÕI SAU MIGRATION

### Hàng ngày cần check

```sql
-- Số log SDK ngày hôm qua
SELECT 
    'SDK mới' AS nguon,
    COUNT(*) AS so_log,
    COUNT(CASE WHEN in_or_out = 'Vào' THEN 1 END) AS vao,
    COUNT(CASE WHEN in_or_out = 'Ra' THEN 1 END) AS ra
FROM attendance_logs
WHERE DATE(check_time AT TIME ZONE 'Asia/Ho_Chi_Minh') = CURRENT_DATE - 1;

-- Log chưa gửi ZNS
SELECT COUNT(*) FROM attendance_logs WHERE zns_status = 'pending';

-- Collector status
SELECT * FROM collector_state;
```

---

## HTTP BACKUP (Giữ nguyên)

File hiện tại vẫn giữ:
- `zk_agent/main.py --realtime` - poll HTTP mỗi 5 giây
- Chỉ push record mới theo từng enrollid
- Dùng khi SDK gặp sự cố

---

## BẮT ĐẦU PHASE 0 NGAY

Ready? Bắt đầu với **Task 0.1: Backup SQL Server**.
