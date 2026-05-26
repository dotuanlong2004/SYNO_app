# Hardware Collector SDK

📦 **Phiên bản:** v1.0.0  
🎯 **Mục đích:** Kết nối máy chấm công Ronald Jack AI-X1 và đẩy dữ liệu real-time về backend SYNO

---

## 📁 Cấu trúc thư mục

```
hardware-collector/
├── ronald-jack-aix1/          # Source code C# collector chính
│   ├── Program.cs             # Logic kết nối COM SDK
│   ├── TestCOMReflect.csproj  # Project file
│   └── README.md              # Hướng dẫn build & run
├── sdk-dlls/                  # DLL từ SDK (KHÔNG sửa)
│   ├── FP_CLOCK_Interop.dll   # COM Interop đã tlbimp
│   └── Newtonsoft.Json.dll    # JSON parsing
├── scripts/                   # Script hỗ trợ cài đặt
│   ├── Register_SDK_x86.bat   # Đăng ký OCX (x86)
│   ├── Delete_SDK_x86.bat     # Gỡ đăng ký OCX
│   ├── FIX_32BIT.bat          # Fix lỗi 32-bit
│   └── FIX_REG.bat            # Fix registry
└── docs/                      # Tài liệu kỹ thuật
    └── BaoCao_KetNoi_RonaldJack.html  # Báo cáo chi tiết
```

---

## ⚡ Bắt đầu nhanh (Quick Start)

### Bước 1: Yêu cầu hệ thống
- Windows 10/11 (x64)
- .NET Framework 4.7.2 hoặc cao hơn
- Visual Studio 2019/2022 hoặc MSBuild

### Bước 2: Cài đặt SDK
```batch
cd scripts
Register_SDK_x86.bat
```

### Bước 3: Build & Chạy
```batch
cd ronald-jack-aix1
dotnet build -c Release
powershell -ExecutionPolicy Bypass -File .\run-collector.ps1
```

---

## 🔧 Cấu hình

Collector đọc cấu hình từ environment variables. Khi chạy local, `run-collector.ps1` sẽ đọc `HARDWARE_API_KEY` từ `backend\.env`, set các biến dev đã xác minh, rồi chạy file `.exe`.

```env
AI_X1_DEVICE_IP=192.168.0.225
AI_X1_DEVICE_PORT=4370
AI_X1_MACHINE_NUMBER=1
AI_X1_COMM_PASSWORD=0
SCHOOL_ID=1
BACKEND_HARDWARE_SCAN_URL=http://localhost:3000/api/v1/hardware/scan
AI_X1_POLL_MS=3000
HARDWARE_API_KEY=<same-secret-as-backend>
COLLECTOR_REQUIRE_HARDWARE_API_KEY=true
```

Không cấu hình `SUPABASE_URL` hoặc `SUPABASE_ANON_KEY` cho collector. Backend chịu trách nhiệm resolve `ma_cham_cong` theo `school_id` và ghi Supabase bằng secret server-side.

---

## 📡 Luồng dữ liệu

```
Ronald Jack AI-X1 → COM SDK → C# Collector → Backend API → Supabase → FCM Notification
  (Enroll ID)         (Pull)        (REST)      (/api/v1/hardware/scan)   (to Parent)
```

---

## 🆘 Troubleshooting

| Lỗi | Nguyên nhân | Cách fix |
|-----|------------|----------|
| `COMException` | Chưa đăng ký OCX | Chạy `Register_SDK_x86.bat` |
| `BadImageFormatException` | Sai platform | Build x86, không phải AnyCPU |
| `False` từ OpenCommPort | Đang ở Serial mode | Kiểm tra `CommPort` không được set |
| Không nhận real-time | ReadGeneralLogData failed | Dùng `ReadAllGLogData` + timestamp filter |

---

## 📞 Hỗ trợ

- **Tài liệu chi tiết:** `docs/BaoCao_KetNoi_RonaldJack.html`
- **Issue tracker:** GitHub Issues
- **Phiên bản mới nhất:** [GitHub Releases](../../releases)

---

## 📝 Changelog

### v1.0.0 (2026-05-11)
- ✅ Kết nối Ronald Jack AI-X1 qua COM SDK
- ✅ Real-time polling (3s)
- ✅ Auto-push to Supabase backend
- ✅ Timestamp-based duplicate detection
- ✅ FCM notification trigger

---

## ⚠️ Lưu ý bảo mật

- **KHÔNG** commit file `.env` chứa API keys
- **KHÔNG** chia sẻ `SUPABASE_SERVICE_ROLE_KEY`
- **KHÔNG** đưa Supabase anon/service key vào collector. Collector chỉ dùng backend URL và `HARDWARE_API_KEY`.

---

**Made with ❤️ for Multi-tenant School Attendance SaaS**
