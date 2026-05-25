# WORKFLOW - Lấy Dữ Liệu Ronald Jack AI-X1

## Thông Tin Hệ Thống
- **Máy chấm công**: Ronald Jack AI-X1
- **SDK**: Ronald Jack 2020
- **Kết nối**: TCP/IP qua LAN
- **Đích**: Supabase (attendance_spam_logs)

## Cấu Hình Máy Chấm Công (Đã Hoàn Thành ✓)
```
Ethernet:
- IP: 192.168.0.225
- Subnet: 255.255.255.0
- Gateway: 192.168.0.1
- Port: 4370

Máy chủ (Server):
- IP Server: 192.168.0.111 (IP laptop)
- Port Server: 5005
- Yêu cầu máy chủ: Có
- Chức năng nối tiếp: Gửi JSON
```

## Các Cách Lấy Dữ Liệu

### Cách 1: SDK Windows (Khuyến nghị)
Dùng COM Object từ SDK Ronald Jack đã đăng ký.

**Ưu điểm**: Ổn định, đầy đủ tính năng
**Nhược điểm**: Phải chạy trên Windows, cần đăng ký DLL

### Cách 2: TCP Push Mode
Máy chấm công tự động gửi dữ liệu khi có quẹt.

**Ưu điểm**: Real-time, đơn giản
**Nhược điểm**: Chỉ nhận được dữ liệu mới, không lấy được dữ liệu cũ

### Cách 3: Web Interface
Truy cập http://192.168.0.225 để export dữ liệu.

**Ưu điểm**: Dễ dùng, không cần lập trình
**Nhược điểm**: Thủ công, không tự động

## Quy Trình SDK Windows (Chi Tiết)

### Bước 1: Kiểm Tra SDK
```powershell
# Kiểm tra COM object đã đăng ký
Get-ChildItem HKLM:\SOFTWARE\Classes | Where-Object {$_.Name -like "*zkem*"}
Get-ChildItem HKLM:\SOFTWARE\Classes | Where-Object {$_.Name -like "*plcomm*"}
```

### Bước 2: Test Kết Nối SDK
Chạy script test kết nối để xác nhận SDK hoạt động.

### Bước 3: Pull Dữ Liệu
Dùng SDK để lấy toàn bộ attendance logs.

### Bước 4: Đẩy Lên Supabase
Parse dữ liệu và gửi lên Supabase.

## Yêu Cầu Kỹ Thuật

### Máy Lấy Dữ Liệu (Laptop/PC)
1. **Hệ điều hành**: Windows 10/11 64-bit
2. **NET Framework**: 4.5+ (đã cài ✓)
3. **SDK Ronald Jack 2020**: Đã copy vào C:\WINDOWS\sysWOW64 ✓
4. **DLL đã đăng ký**: Thành công ✓

### Mạng LAN
- Laptop và máy chấm công cùng subnet (192.168.0.x)
- Ping được: `ping 192.168.0.225` ✓
- Port 4370 mở: ✓

## Các File SDK Quan Trọng

| File | Chức Năng |
|------|-----------|
| zkemkeeper.dll | ZKTeco SDK chính |
| plcommpro.dll | PLC Communication |
| zkemsdk.dll | ZK SDK |
| pltcpcomm.dll | TCP Communication |
| rscomm.dll | RS232 Communication |
| udpcomm.dll | UDP Communication |

## Khả Thi?

✅ **SDK đã đăng ký thành công**
✅ **Mạng kết nối OK**
✅ **Port 4370 mở**

**Kết luận**: Hoàn toàn khả thi! Cần viết lại script để dùng đúng COM object của SDK.
