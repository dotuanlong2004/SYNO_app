# Hardware Collector SDK

📦 **Phiên bản:** v1.0.0  
🎯 **Mục đích:** Kết nối máy chấm công Ronald Jack AI-X1 và đẩy dữ liệu real-time về Supabase

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
dotnet run
```

---

## 🔧 Cấu hình

Tạo file `.env` trong thư mục `ronald-jack-aix1`:

```env
# Device Settings
DEVICE_IP=192.168.0.225
DEVICE_PORT=4370
MACHINE_NUMBER=1

# Backend Settings
BACKEND_URL=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SCHOOL_ID=your-school-id

# Polling Interval (giây)
POLL_INTERVAL=3
```

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
- Anon key là publishable, có thể include trong code

---

**Made with ❤️ for Multi-tenant School Attendance SaaS**
