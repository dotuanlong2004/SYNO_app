# ZKCollector - Tự động sửa lỗi (Self-Healing)

## Các tình huống tự động fix

### 1. COM Object hỏng → Tự tạo lại
```
Log: "🔄 Self-heal: Will recreate COM object on next cycle"
Action: Sau 3 lần lỗi kết nối, tự động dispose và new CZKEMClass()
```

### 2. Device busy (Error -2) → Thông báo rõ
```
Log: "💡 Self-heal: Ensure MITA Pro or other apps using port 4370 are closed"
Action: Exponential backoff + gợi ý đóng app chiếm port
```

### 3. Ngày giờ từ máy sai → Dùng giờ hệ thống
```
Log: "⚠ Self-heal: Invalid date from device, using current time"
Action: Validate year/month/day, nếu sai dùng DateTime.Now
```

### 4. Timezone conversion fail → Fallback UTC+7
```
Action: Try-catch timezone, fallback manual subtract 7 hours
```

### 5. Push Supabase fail → Retry 3 lần
```
Log: "⏳ Push retry 1/3..."
Action: Linear backoff 1s, 2s, 3s sau đó để polling backup
```

### 6. Connection timeout → Auto reconnect
```
Log: "⏳ Retrying in 10s..."
Action: Exponential backoff 5s, 10s, 15s, 20s, 25s max 30s
```

## Log symbols

| Symbol | Ý nghĩa |
|--------|---------|
| ✓ | Thành công |
| ⚠ | Cảnh báo nhưng đã self-heal |
| ✗ | Lỗi nghiêm trọng |
| 🔄 | Đang tự sửa |
| 💡 | Gợi ý hành động |
| ⏳ | Đang retry |
| 📡 | Real-time event |

## Không cần báo lại bug nếu thấy:

- ✅ "COM object recreated (self-heal)" - đã tự fix
- ✅ "Push retry X/3" - đang retry tự động
- ✅ "Retrying in Xs" - đang reconnect tự động

**Chỉ báo khi**:
- ✗ Service crash hoàn toàn
- ✗ "Failed to recreate COM object"
- ✗ Log không vào Supabase sau 5 phút
