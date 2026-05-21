# KẾ HOẠCH TRIỂN KHAI - THỰC TẾ (Đã điều chỉnh)

## MÔI TRƯỜNG THỰC TẾ

| Thành phần | Thông tin |
|------------|-----------|
| **Máy AI-X1** | IP: 192.168.0.225 (HTTP API port 80, TCP port 5005) |
| **Laptop/Server** | IP: 192.168.0.106 (Windows/Linux/Mac) |
| **Database** | Supabase (PostgreSQL cloud) |
| **Thông báo** | Zalo ZNS (n8n) - cần kết nối |
| **Số học sinh** | 500 em |

**Lưu ý quan trọng**: 
- Không có SQL Server MITACOSQL (không cần migrate data cũ)
- Không có Windows Server 2012 riêng
- SDK COM (zkemkeeper.dll) **bắt buộc chạy trên Windows** - nếu muốn dùng phải cài trên laptop hiện tại

---

## PHƯƠNG ÁN 1: HTTP API (Khuyến nghị - Đã chạy)

Giữ nguyên HTTP API hiện tại, bổ sung logic còn thiếu.

### Ưu điểm
- ✅ Chạy được trên mọi OS (Windows/Mac/Linux)
- ✅ Không cần đăng ký COM DLL
- ✅ Không xung đột với MITA (vì không có MITA)
- ✅ Dễ debug, dễ triển khai

### Nhược điểm
- ❌ Polling (5 giây/lần) thay vì real-time push
- ❌ Không sync thời gian máy tự động

### Việc cần làm

| # | Task | Mô tả | File |
|---|------|-------|------|
| 1 | **Tạo schema Supabase** | 3 bảng: students, attendance_logs, collector_state | `supabase/schema.sql` |
| 2 | **Import 500 học sinh** | Nhập thủ công hoặc từ Excel vào Supabase | Manual/Script |
| 3 | **Thêm logic Vào/Ra** | Xen kẽ Vào/Ra + chặn 10 phút | `http_fetcher.py` |
| 4 | **Kết nối n8n** | Workflow đọc từ Supabase gửi ZNS | n8n workflow |
| 5 | **Test end-to-end** | Quét mặt → Log → ZNS | Full test |

---

## PHƯƠNG ÁN 2: SDK COM (Windows only)

Nếu muốn real-time push như migration plan, **bắt buộc phải cài trên Windows**.

### Yêu cầu
- Windows 10/11/Server (có thể dùng laptop hiện tại)
- .NET Framework 4.7.2+
- zkemkeeper.dll từ Ronald Jack

### Khuyến nghị
**Không làm** trừ khi thực sự cần real-time push. HTTP API đủ tốt cho 500 học sinh.

---

## SCHEMA SUPABASE (Chuẩn hóa)

Dựa trên migration plan v2:

```sql
-- 1. Bảng students (thông tin học sinh)
create table students (
    id serial primary key,
    ma_cham_cong integer unique not null,  -- ID trên máy AI-X1
    ma_hoc_sinh varchar(20),
    ho_ten varchar(100) not null,
    lop varchar(50),
    sdt_phu_huynh varchar(20),
    zalo_user_id varchar(50),
    is_active boolean default true,
    created_at timestamp with time zone default now()
);

-- Index để tìm kiếm nhanh
create index idx_students_ma_cham_cong on students(ma_cham_cong);
create index idx_students_sdt on students(sdt_phu_huynh);

-- 2. Bảng attendance_logs (log chấm công)
create table attendance_logs (
    id serial primary key,
    ma_cham_cong integer references students(ma_cham_cong),
    check_time timestamp with time zone not null,
    in_or_out varchar(10) check (in_or_out in ('Vào', 'Ra')),
    verify_mode integer,  -- 0=Password, 1=FP, 2=Card, 3=Face...
    device_ip varchar(15) default '192.168.0.225',
    raw_payload jsonb,  -- Lưu toàn bộ data từ máy
    -- ZNS tracking
    zns_status varchar(20) default 'pending' check (zns_status in ('pending', 'sent', 'failed')),
    zns_sent_at timestamp with time zone,
    zns_msg_id varchar(100),
    zns_retry_count integer default 0,
    created_at timestamp with time zone default now(),
    -- Chặn duplicate
    constraint uq_attendance unique (ma_cham_cong, check_time)
);

-- Index cho query thường dùng
create index idx_logs_ma_cham_cong on attendance_logs(ma_cham_cong);
create index idx_logs_check_time on attendance_logs(check_time);
create index idx_logs_zns_status on attendance_logs(zns_status) where zns_status = 'pending';
create index idx_logs_ma_cham_cong_time on attendance_logs(ma_cham_cong, check_time desc);

-- 3. Bảng collector_state (theo dõi collector)
create table collector_state (
    id serial primary key,
    device_ip varchar(15) unique not null,
    collector_type varchar(20) default 'http',  -- 'http' hoặc 'sdk'
    last_pull_time timestamp with time zone,
    last_seen timestamp with time zone,
    status varchar(20) default 'offline' check (status in ('online', 'offline', 'error')),
    error_count integer default 0,
    error_message text,
    updated_at timestamp with time zone default now()
);

-- RLS (Row Level Security) - Chỉ cho phép school_id tương ứng
alter table students enable row level security;
alter table attendance_logs enable row level security;
alter table collector_state enable row level security;

-- Policy: Cho phép tất cả operations (đơn giản hóa)
create policy "Allow all" on students for all using (true);
create policy "Allow all" on attendance_logs for all using (true);
create policy "Allow all" on collector_state for all using (true);
```

---

## LOGIC VÀO/RA + CHẶN 10 PHÚT (Cần implement)

Giả thuật trong Python:

```python
async def determine_in_or_out(ma_cham_cong: int, check_time: datetime) -> Optional[str]:
    """
    Xác định Vào/Ra theo logic MITA:
    - Lần đầu trong ngày → "Vào"
    - Xen kẽ Vào ↔ Ra
    - Chặn nếu < 10 phút từ lần cuối
    """
    from datetime import date
    
    today = check_time.date()
    
    # Lấy log cuối cùng trong ngày của học sinh này
    result = await supabase.table('attendance_logs')\
        .select('in_or_out, check_time')\
        .eq('ma_cham_cong', ma_cham_cong)\
        .gte('check_time', f"{today}T00:00:00")\
        .lt('check_time', f"{today + timedelta(days=1)}T00:00:00")\
        .order('check_time', desc=True)\
        .limit(1)\
        .execute()
    
    if not result.data:
        return "Vào"  # Lần đầu trong ngày
    
    last_log = result.data[0]
    last_time = datetime.fromisoformat(last_log['check_time'])
    diff_minutes = (check_time - last_time).total_seconds() / 60
    
    # Chặn quẹt liên tiếp < 10 phút
    if diff_minutes < 10:
        return None  # Bỏ qua
    
    # Xen kẽ Vào/Ra
    return "Ra" if last_log['in_or_out'] == "Vào" else "Vào"
```

---

## QUYẾT ĐỊNH

Bạn chọn phương án nào?

**A. HTTP API (khuyến nghị)**: Chỉ cần tạo schema Supabase + bổ sung logic Vào/Ra vào code hiện tại

**B. SDK COM**: Cần cài Windows, .NET, zkemkeeper.dll trên laptop → real-time push nhưng phức tạp

Tôi recommend **A** - HTTP API đủ mạnh cho 500 học sinh, dễ maintain.

**Bắt đầu với A ngay?**
