# Phân tích lỗi SDK COM và giải pháp

## 🔴 Vấn đề gốc

File `C:\Windows\SysWOW64\zkemkeeper.dll` là **64-bit** (thay vì 32-bit).

**Dấu hiệu:**
- PE Header Machine Type: `0x8664` (x64) thay vì `0x14C` (i386)
- Lỗi `800700c1`: "is not a valid Win32 application"
- Khi 32-bit process (ZKComBridge.exe) cố load DLL → thất bại

**Tại sao:**
- Phần mềm Ronald Jack cài đặt copy nhầm file 64-bit vào SysWOW64
- Hoặc Windows tự động redirect khi copy

---

## ✅ Giải pháp 1: Tìm file 32-bit đúng (KHUYẾN NGHỊ)

### Bước 1: Tìm trong bộ cài Ronald Jack
Thường nằm ở:
```
C:\Program Files (x86)\Ronald Jack\*
C:\Program Files\Ronald Jack\*
D:\MITA Pro\*
```

### Bước 2: Kiểm tra architecture
Dùng PowerShell:
```powershell
$bytes = [IO.File]::ReadAllBytes("path\to\zkemkeeper.dll")
$peOffset = [BitConverter]::ToInt32($bytes, 0x3C)
$machine = [BitConverter]::ToUInt16($bytes, $peOffset + 4)
if ($machine -eq 0x14c) { "32-bit OK" } elseif ($machine -eq 0x8664) { "64-bit WRONG" }
```

### Bước 3: Copy file 32-bit vào SysWOW64
```cmd
# Admin cmd
xcopy "path\to\32bit\zkemkeeper.dll" "C:\Windows\SysWOW64\" /Y
C:\Windows\SysWOW64\regsvr32 "C:\Windows\SysWOW64\zkemkeeper.dll"
```

---

## ✅ Giải pháp 2: Cài lại phần mềm Ronald Jack 32-bit

1. Gỡ phần mềm Ronald Jack hiện tại
2. Download bản **32-bit** từ trang chủ
3. Cài đặt lại → tự động copy đúng file vào SysWOW64

---

## ✅ Giải pháp 3: Dùng máy ảo/ máy khác 32-bit

Nếu không tìm được file 32-bit, dùng:
- Windows XP/7 32-bit trong VM
- Hoặc máy tính cũ chạy Windows 32-bit
- Chạy ZKComBridge trên đó, push data qua HTTP đến service chính

---

## ⛔ Tại sao không thể "hack" được

| Cách thử | Kết quả |
|---------|---------|
| Force 32-bit EXE | ❌ Không load được 64-bit DLL |
| CorFlags | ❌ Chỉ đánh dấu EXE, không thay đổi DLL |
| Registry fix | ❌ DLL vẫn là 64-bit |
| COM Surrogate | ❌ dllhost.exe 32-bit vẫn không load được 64-bit DLL |

**Bắt buộc phải có file zkemkeeper.dll 32-bit (i386).**

---

## 🔧 Script kiểm tra nhanh

Chạy file `CHECK_DLL_ARCH.bat` đã tạo để xác nhận.

Kết quả mong muốn:
```
SysWOW64: 32-bit (0x14C) ✅
```

Kết quả hiện tại:
```
SysWOW64: 64-bit (0x8664) ❌
```

---

## 📞 Liên hệ Ronald Jack

Yêu cầu họ cung cấp:
1. File `zkemkeeper.dll` 32-bit chính hãng
2. Hoặc link download phần mềm 32-bit

---

## 🎯 Tóm tắt

**Không thể chạy SDK COM 32-bit khi file DLL là 64-bit.**

Cần:
1. Tìm file 32-bit trong bộ cài (thư mục Program Files)
2. Hoặc cài lại phần mềm 32-bit
3. Hoặc dùng máy 32-bit riêng

Code ZKComBridge và ZKCollector đã sẵn sàng, chỉ cần file DLL đúng architecture là chạy được ngay.
