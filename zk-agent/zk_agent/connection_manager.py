"""
Module: connection_manager.py
Mục đích: Quản lý toàn bộ vòng đời kết nối đến máy chấm công ZKTeco
          thông qua zkemkeeper.dll (COM object).

⚠️ CẢNH BÁO KIẾN TRÚC 32-BIT ⚠️
=============================================================
Script này BẮT BUỘC phải chạy bằng Python 32-bit (x86).
Lý do: zkemkeeper.dll nằm trong C:\\Windows\\SysWOW64 là DLL 32-bit.
Python 64-bit KHÔNG THỂ load DLL 32-bit qua win32com.

Cách kiểm tra:
  python -c "import struct; print(struct.calcsize('P')*8)"
  -> Phải in ra: 32

Nếu bạn đang dùng Python 64-bit, hãy cài Python 32-bit tại:
  https://www.python.org/downloads/windows/
=============================================================
"""

import win32com.client  # Yêu cầu: pip install pywin32 (32-bit)
import os
from datetime import datetime


def _log(cap, msg: str) -> None:
    """In log có timestamp và cấp độ."""
    print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} [{cap}] {msg}")


def log_info(msg: str) -> None:
    _log("INFO", msg)


def log_error(msg: str) -> None:
    _log("ERROR", msg)


def log_warn(msg: str) -> None:
    _log("WARN", msg)


class ConnectionManager:
    """
    Quản lý kết nối TCP đến máy chấm công ZKTeco AI-X1 (Ronald Jack)
    thông qua COM object zkemkeeper.ZKEM.

    Sử dụng context manager (with statement) để đảm bảo ngắt kết nối
    ngay cả khi có lỗi xảy ra.

    Ví dụ sử dụng:
        with ConnectionManager(ip="192.168.0.225", port=4370) as cm:
            sdk = cm.sdk  # Đối tượng COM đã kết nối
            # ... thực hiện các thao tác ...
    """

    def __init__(self, ip: str, port: int, timeout_ms: int = 30000):
        """
        Khởi tạo ConnectionManager.

        Tham số:
            ip         : Địa chỉ IP của máy chấm công
            port       : Cổng TCP (thường là 4370)
            timeout_ms : Timeout kết nối tính bằng mili-giây
        """
        self.ip = ip
        self.port = port
        self.timeout_ms = timeout_ms
        self.sdk = None          # COM object zkemkeeper.ZKEM
        self._connected = False

    def connect(self) -> bool:
        """
        Khởi tạo COM object và kết nối TCP đến máy chấm công.

        Trả về:
            True  - Kết nối thành công
            False - Kết nối thất bại
        """
        try:
            log_info("Đang khởi tạo COM object zkemkeeper.ZKEM...")
            self.sdk = win32com.client.Dispatch("zkemkeeper.ZKEM")
        except Exception as exc:
            log_error(
                f"Không thể tạo COM object zkemkeeper.ZKEM. "
                f"Hãy chắc chắn đã chạy 'Register_SDK_x86.bat' với quyền Admin.\n"
                f"Chi tiết lỗi: {exc}"
            )
            return False

        try:
            log_info(f"Đang đặt timeout: {self.timeout_ms}ms...")
            self.sdk.SetCommPassword(0)   # Mật khẩu mặc định = 0

            log_info(f"Đang kết nối TCP đến {self.ip}:{self.port}...")
            ket_qua = self.sdk.Connect_Net(self.ip, self.port)

            if not ket_qua:
                log_error(
                    f"Kết nối thất bại. Kiểm tra:\n"
                    f"  1. Máy chấm công đang bật và IP={self.ip} đúng không?\n"
                    f"  2. Cổng {self.port} không bị firewall chặn\n"
                    f"  3. Máy tính và máy chấm công cùng mạng LAN"
                )
                return False

            self._connected = True
            log_info(f"✓ Kết nối thành công đến {self.ip}:{self.port}")
            return True

        except Exception as exc:
            log_error(f"Lỗi trong quá trình kết nối: {exc}")
            self._connected = False
            return False

    def disconnect(self) -> None:
        """
        Ngắt kết nối khỏi máy chấm công và giải phóng COM object.
        Hàm này luôn được gọi, kể cả khi có lỗi xảy ra.
        """
        if self.sdk is not None and self._connected:
            try:
                self.sdk.Disconnect()
                log_info("✓ Đã ngắt kết nối khỏi máy chấm công.")
            except Exception as exc:
                log_warn(f"Lỗi khi ngắt kết nối (có thể bỏ qua): {exc}")
            finally:
                self._connected = False
                self.sdk = None

    def ping(self) -> bool:
        """
        Kiểm tra xem có thể kết nối đến máy chấm công không.
        Kết nối, lấy thông tin firmware, rồi ngắt kết nối.

        Trả về:
            True  - Máy phản hồi
            False - Không thể kết nối
        """
        log_info("--- Bắt đầu PING đến máy chấm công ---")
        if not self.connect():
            return False

        try:
            # Lấy thông tin máy để xác nhận kết nối thực sự hoạt động
            firmware = self.sdk.GetFirmwareVersion()
            serial = ""
            # Thử lấy serial (không bắt buộc phải thành công)
            try:
                self.sdk.GetSerialNumber(serial)
            except Exception:
                pass

            log_info(f"✓ PING thành công!")
            log_info(f"  Firmware: {firmware}")
            return True

        except Exception as exc:
            log_error(f"Lỗi khi lấy thông tin máy: {exc}")
            return False

        finally:
            self.disconnect()

    def __enter__(self):
        """Cho phép dùng 'with ConnectionManager(...) as cm:'"""
        if not self.connect():
            raise ConnectionError(
                f"Không thể kết nối đến máy chấm công {self.ip}:{self.port}"
            )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Luôn ngắt kết nối khi thoát khỏi block 'with', dù có lỗi hay không."""
        if exc_type is not None:
            log_error(f"Phát hiện lỗi trong block 'with': {exc_val}")
        self.disconnect()
        # Trả về False để không nuốt exception
        return False
