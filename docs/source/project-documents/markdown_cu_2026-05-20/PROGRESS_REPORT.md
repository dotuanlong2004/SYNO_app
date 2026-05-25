# Báo cáo tiến độ — Hệ thống Chấm công AI-X1

**Ngày báo cáo**: 29/04/2026  
**Thiết bị**: Ronald Jack AI-X1 (SN: `AYTD01032550`, IP: `192.168.0.225`)  
**Mục tiêu**: Tích hợp máy chấm công với hệ thống backend Supabase để nhận log chấm công theo thời gian thực.

---

## Tiến độ tổng thể

| Module | Trạng thái |
|---|---|
| Backend API (Node.js + Express) | ✅ Hoàn thành |
| Admin Web (React + Vite + Tailwind) | ✅ Hoàn thành |
| Flutter App (mobile cho phụ huynh) | ✅ Hoàn thành |
| Supabase Database + RLS | ✅ Hoàn thành |
| **Tích hợp máy chấm công AI-X1** | ❌ Chưa giải quyết được |

---

## Vấn đề không giải quyết được: Lấy dữ liệu từ máy chấm công Ronald Jack AI-X1

### Bối cảnh
Máy Ronald Jack AI-X1 chạy **Linux nhúng**, khác hoàn toàn với dòng máy ZKTeco Windows truyền thống. Không có tài liệu SDK công khai cho dòng máy này.

---

## Tất cả các phương pháp đã thử

### 1. ZKTeco SDK C# (`zkemkeeper.dll`)
- **Cách làm**: Dùng COM object `zkemkeeper.dll`, gọi `Connect_Net(IP, port)`, sau đó gọi `GetGeneralAttLog` để lấy log.
- **Kết quả**: Kết nối thất bại.
- **Lý do**: Máy AI-X1 là dòng máy Linux thế hệ mới, không tương thích với SDK ZKTeco cũ — các lệnh SDK như `GetGeneralAttLog`, `GetAttLog` không được hỗ trợ.

---

### 2. ZKTeco SDK Node.js (`zkteco-js`)
- **Cách làm**: Dùng thư viện `zkteco-js` kết nối và gọi lệnh lấy attendance log.
- **Kết quả**: Kết nối thất bại.
- **Lý do**: Cùng lý do #1 — máy AI-X1 không tương thích SDK ZKTeco cũ.

---

### 3. Pull Web API — lệnh `getRtLog` (sai casing)
- **Cách làm**: Gọi `POST http://192.168.0.225/api` với payload `{"cmd":"getRtLog","index":0}`.
- **Kết quả**: Lỗi `can not find this command`.
- **Lý do**: Máy phân biệt chữ hoa/thường, tên lệnh đúng phải là `getrtlog` (toàn chữ thường). Phát hiện ra sau khi đọc source JS của trang `rtlogview.html` trên máy.

---

### 4. Pull Web API — lệnh `getrtlog` (đúng, nhưng timeout)
- **Cách làm**: Sửa thành `{"cmd":"getrtlog","index":0}`, thêm Cookie `pwd=<device-password>`, tăng timeout từ 5s lên 20s.
- **Kết quả**: Timeout liên tục.
- **Lý do**: Máy cố trả toàn bộ log từ đầu, dữ liệu quá lớn vượt timeout.

---

### 5. Pull Web API — `getrtlog` với index cao
- **Cách làm**: Truyền `index=9999999` để bỏ qua log cũ, chỉ lấy log mới. Sau đó thử `index=0` lại sau khi quét mặt.
- **Kết quả**: Cả 2 đều trả `{"count":0,"record":[]}`.
- **Lý do**: Máy không lưu log vào vùng nhớ mà API `getrtlog` truy vấn, hoặc log bị xóa. Quét mặt xong cũng không có log mới xuất hiện qua API này.

---

### 6. JSON Push Server Node.js (port 5005)
- **Cách làm**: Chạy HTTP server Node.js (`json-server.js`) chờ máy tự đẩy JSON lên `POST /`.
- **Kết quả**: Server chạy bình thường nhưng không nhận được request nào từ máy.
- **Lý do**: Máy AI-X1 không có tính năng push JSON.

---

### 7. ADMS HTTP Push Server — Node.js (`adms-server.js`, port 5005)
- **Cách làm**: Chạy Node.js HTTP server với 2 endpoint chuẩn ADMS ZKTeco: `GET /iclock/getrequest` (heartbeat) và `POST /iclock/cdata` (attendance data).
- **Kết quả**: Server chạy, đứng yên, không nhận được request nào.
- **Lý do**: Máy không gửi HTTP ADMS — gửi binary TCP (`a5 5a ...`). HTTP server không xử lý được binary protocol này.

---

### 8. ADMS HTTP Push Server — Python Flask (`server.py`, port 5005)
- **Cách làm**: Tương tự #7 nhưng dùng Flask Python, cấu hình máy Cloud Server Mode = ADMS, Server Address = `192.168.0.106`, Port = `5005`.
- **Kết quả**: Server chạy, đứng yên, không nhận được request nào.
- **Lý do**: Cùng lý do #7 — máy gửi binary TCP, Flask bỏ qua hoàn toàn.

---

### 9. TCP Binary Server (`tcp_server.py`, port 5005)
- **Cách làm**: Viết TCP socket server thuần Python nhận raw binary, in HEX ra terminal, phân tích packet và gửi ACK.
- **Kết quả**: **Kết nối thành công** từ `192.168.0.225`, decode được SN `AYTD01032550`. Nhưng chỉ nhận `CMD=1` (heartbeat) lặp lại liên tục, không có attendance data dù quét mặt nhiều lần.
- **Lý do**: ACK response sai format binary ZKTeco → máy không hoàn thành handshake → không gửi attendance data → disconnect rồi reconnect lại vòng lặp vô tận.

---

### 10. Flask HTTP (port 8080) + TCP Binary (port 5005) chạy song song
- **Cách làm**: Flask serve dashboard/API trên port 8080, TCP socket lắng nghe binary trên port 5005 qua thread riêng trong cùng 1 process.
- **Kết quả**: Nhận được packet binary từ `192.168.0.225`, vẫn chỉ `CMD=1` heartbeat.
- **Lý do**: Cùng lý do #9 — handshake chưa hoàn thành đúng.

---

### 11. Giả lập bằng `test_push.py`
- **Cách làm**: Script Python giả lập máy chấm công đẩy ADMS data lên server theo đúng format ATTLOG.
- **Kết quả**: Hoạt động hoàn hảo — 10 records insert thành công, dashboard hiển thị đúng, tất cả API endpoint hoạt động.
- **Lý do thất bại**: Chỉ là dữ liệu ảo, không phải từ máy thật.

---

## Tóm tắt kết quả

| # | Phương pháp | Kết quả |
|---|---|---|
| 1 | ZKTeco SDK C# | ❌ Máy không tương thích SDK cũ |
| 2 | ZKTeco SDK Node.js | ❌ Máy không tương thích SDK cũ |
| 3 | Web API `getRtLog` | ❌ Sai tên lệnh |
| 4 | Web API `getrtlog` | ❌ Timeout |
| 5 | Web API index cao | ❌ Máy không có log trả về |
| 6 | JSON Push server | ❌ Máy không hỗ trợ push JSON |
| 7 | ADMS Node.js HTTP | ❌ Máy dùng binary TCP, không phải HTTP |
| 8 | ADMS Flask HTTP | ❌ Máy dùng binary TCP, không phải HTTP |
| 9 | TCP Binary server | ⚠️ Kết nối được, handshake chưa hoàn thành |
| 10 | Flask + TCP hybrid | ⚠️ Cùng trạng thái #9 |
| 11 | Giả lập `test_push.py` | ✅ Chỉ dữ liệu ảo |

---

## Nguyên nhân cốt lõi

Máy Ronald Jack AI-X1 dùng **ZKTeco proprietary binary TCP protocol** — giao thức độc quyền, không có tài liệu công khai. Server nhận được packet dạng:

```
a5 5a 01 00 [seq] a5 84 31 00 00 00 00 [cmd] 02 AYTD01032550 00 00...
```

Máy liên tục gửi `CMD=1` (heartbeat) nhưng không gửi attendance data vì server chưa trả ACK đúng format để hoàn thành handshake theo đúng chuẩn binary protocol của ZKTeco.

---

## Hướng giải quyết tiếp theo (chưa thực hiện)

1. **Wireshark**: Cài phần mềm Ronald Jack gốc trên máy tính, bắt toàn bộ TCP traffic bằng Wireshark khi phần mềm kết nối vào máy chấm công → reverse engineer được đúng format handshake và attendance packet.
2. **Liên hệ Ronald Jack VN**: Xin tài liệu SDK hoặc protocol specification chính hãng.
3. **Thư viện `pyzk`**: Thử thư viện Python đã reverse engineer binary protocol ZKTeco — có thể tương thích AI-X1.
