# 📦 Hướng dẫn tạo GitHub Release

## ✅ Release hiện tại: v1.0.0

**Tag đã tạo:** `v1.0.0`

### Cách tạo Release trên GitHub Web

1. **Truy cập:** https://github.com/dotuanlong2004/attendance_app/releases
2. **Click:** "Draft a new release" hoặc "Create a new release"
3. **Chọn tag:** `v1.0.0` (đã có sẵn)
4. **Title:** `v1.0.0 - Ronald Jack AI-X1 Integration`
5. **Description:** Copy từ dưới đây ⬇️

---

## 📝 Release Notes Template (Copy & Paste)

```markdown
## 🎉 Release v1.0.0 - Ronald Jack AI-X1 Real-time Integration

### ✨ New Features
- ✅ Real-time attendance collection from Ronald Jack AI-X1 device
- ✅ COM SDK integration (FP_CLOCK.ocx via tlbimp)
- ✅ Auto-push to Supabase backend
- ✅ FCM notification to parent on new scan
- ✅ Timestamp-based duplicate detection
- ✅ Student mapping (ma_cham_cong → student_code)

### 📦 Included in this Release

#### Hardware Collector SDK (`hardware-collector/`)
- **C# Source Code:** `ronald-jack-aix1/Program.cs`
- **COM Interop DLL:** `sdk-dlls/FP_CLOCK_Interop.dll`
- **Helper Scripts:** Register SDK, Fix 32-bit, Delete SDK
- **Documentation:** Full README + Technical Report

#### Backend Updates
- Fixed `attendanceWorker.js` to query `user_profiles` instead of `users`
- Working FCM notification pipeline

### 🚀 Quick Start

1. **Setup SDK:**
   ```batch
   cd hardware-collector/scripts
   Register_SDK_x86.bat
   ```

2. **Configure:**
   Edit `hardware-collector/ronald-jack-aix1/Program.cs`:
   - Device IP: `192.168.0.225`
   - Backend URL: `http://localhost:3000`
   - Supabase credentials

3. **Build & Run:**
   ```batch
   cd hardware-collector/ronald-jack-aix1
   dotnet build -c Release
   dotnet run
   ```

### 📋 Requirements
- Windows 10/11
- .NET Framework 4.7.2+
- Visual Studio 2019+ (hoặc MSBuild)
- Ronald Jack AI-X1 device (IP: 192.168.0.225:4370)

### 🔧 Device Settings
| Setting | Value |
|---------|-------|
| IP | 192.168.0.225 |
| Port | 4370 |
| Machine ID | 1 |
| Protocol | TCP/IP |

### 📚 Documentation
- [Hardware Collector README](hardware-collector/README.md)
- [Ronald Jack AIX1 Setup](hardware-collector/ronald-jack-aix1/README.md)
- [Technical Report](hardware-collector/docs/BaoCao_KetNoi_RonaldJack.html)

### 🐛 Known Issues
- Must build as x86 (not AnyCPU/x64)
- Requires OCX registration with admin rights

---

**Made with ❤️ for Multi-tenant School Attendance SaaS**
```

---

## 🔄 Workflow: Mỗi khi push code mới

### Bắt buộc phải làm sau mỗi lần commit quan trọng:

```batch
# 1. Tạo tag mới (theo semver)
git tag -a v1.1.0 -m "Release v1.1.0 - [tính năng mới]"
git push origin v1.1.0

# 2. Vào GitHub → Releases → Draft new release
# 3. Chọn tag v1.1.0
# 4. Copy template bên dưới, sửa version và changelog
# 5. Publish release
```

---

## 📋 Release Checklist (Mỗi lần release)

- [ ] Code đã test và chạy ổn định
- [ ] README.md đã cập nhật
- [ ] Version trong code đã bump
- [ ] Tag đã push (`git push origin vX.Y.Z`)
- [ ] Release notes đầy đủ, có hướng dẫn
- [ ] Có hướng dẫn cài đặt cho người mới
- [ ] Đính kèm binary nếu cần (optional)

---

## 🏷️ Version Naming

| Pattern | Ý nghĩa | Ví dụ |
|---------|---------|-------|
| v1.0.0 | Major release | Lần đầu production |
| v1.1.0 | Minor feature | Thêm tính năng mới |
| v1.1.1 | Bug fix | Sửa lỗi nhỏ |

---

## 🚀 Tạo Release ngay bây giờ

**Link trực tiếp:** https://github.com/dotuanlong2004/attendance_app/releases/new?tag=v1.0.0

Sau khi tạo xong, ae có thể:
1. Download source code (zip/tar.gz)
2. Xem hướng dẫn trong README
3. Clone repo và build

---

## 🇻🇳 Release Notes Tiếng Việt (Cho ae dễ hiểu)

Copy phần này vào Description nếu ae chủ yếu là người Việt:

```markdown
## 🎉 Release v1.0.0 - Tích hợp máy chấm công Ronald Jack AI-X1

### ✨ Tính năng mới
- ✅ Thu thập dữ liệu chấm công real-time từ máy Ronald Jack AI-X1
- ✅ Tích hợp COM SDK (FP_CLOCK.ocx qua tlbimp)
- ✅ Tự động đẩy dữ liệu lên Supabase backend
- ✅ Gửi thông báo FCM đến phụ huynh khi học sinh chấm công
- ✅ Phát hiện trùng lặp dựa trên timestamp
- ✅ Mapping học sinh (ma_cham_cong → student_code)

### 📦 Nội dung bao gồm

#### Hardware Collector SDK (`hardware-collector/`)
- **Source code C#:** `ronald-jack-aix1/Program.cs`
- **COM Interop DLL:** `sdk-dlls/FP_CLOCK_Interop.dll`
- **Script hỗ trợ:** Đăng ký SDK, Fix 32-bit, Gỡ SDK
- **Tài liệu:** README đầy đủ + Báo cáo kỹ thuật

#### Cập nhật Backend
- Sửa `attendanceWorker.js` query đúng bảng `user_profiles`
- Pipeline thông báo FCM hoạt động ổn định

### 🚀 Hướng dẫn nhanh

1. **Cài đặt SDK:**
   ```batch
   cd hardware-collector/scripts
   Register_SDK_x86.bat
   ```

2. **Cấu hình:**
   Sửa file `hardware-collector/ronald-jack-aix1/Program.cs`:
   - IP thiết bị: `192.168.0.225`
   - URL backend: `http://localhost:3000`
   - Thông tin Supabase

3. **Build & Chạy:**
   ```batch
   cd hardware-collector/ronald-jack-aix1
   dotnet build -c Release
   dotnet run
   ```

### 📋 Yêu cầu hệ thống
- Windows 10/11
- .NET Framework 4.7.2 trở lên
- Visual Studio 2019+ (hoặc MSBuild)
- Máy chấm công Ronald Jack AI-X1 (IP: 192.168.0.225:4370)

### 🔧 Cấu hình thiết bị
| Thiết lập | Giá trị |
|-----------|---------|
| IP | 192.168.0.225 |
| Port | 4370 |
| Machine ID | 1 |
| Protocol | TCP/IP |

### 📚 Tài liệu tham khảo
- [Hardware Collector README](hardware-collector/README.md)
- [Hướng dẫn Ronald Jack AIX1](hardware-collector/ronald-jack-aix1/README.md)
- [Báo cáo kỹ thuật](hardware-collector/docs/BaoCao_KetNoi_RonaldJack.html)

### 🐛 Lưu ý
- Phải build x86 (không phải AnyCPU/x64)
- Cần quyền Admin để đăng ký OCX

---

**Việt hóa bởi team phát triển 🇻🇳**
```

---

**Ghi nhớ:** Luôn tạo Release khi có code mới để ae dễ theo dõi và test!
