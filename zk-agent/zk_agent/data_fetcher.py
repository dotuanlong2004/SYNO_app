"""
Module: data_fetcher.py
Mục đích: Lấy dữ liệu chấm công từ máy ZKTeco thông qua COM SDK.

⚠️ BẮT BUỘC chạy bằng Python 32-bit. Xem giải thích tại connection_manager.py
"""

from dataclasses import dataclass
from datetime import datetime
from typing import List

from .connection_manager import log_info, log_error, log_warn


@dataclass
class BanGhiChamCong:
    """
    Đại diện cho một lần quẹt thẻ từ máy chấm công.

    Các trường khớp với cột trong Supabase:
        student_code  -> attendance_spam_logs.student_code  (VARCHAR NOT NULL)
        school_id     -> attendance_spam_logs.school_id     (VARCHAR NOT NULL)
        scanned_at    -> attendance_spam_logs.created_at    (TIMESTAMPTZ NOT NULL)
        enroll_number : Mã số đăng ký trên máy (dùng để map sang student_code)
        verify_type   : Kiểu xác thực (0=mật khẩu, 1=vân tay, 15=mặt)
    """
    enroll_number: str    # Mã số đăng ký trên máy ZKTeco
    scanned_at: datetime  # Thời điểm quẹt thẻ (UTC)
    verify_type: int      # Kiểu xác thực: 0=Mật khẩu, 1=Vân tay, 15=Khuôn mặt
    in_out_state: int     # Trạng thái: 0=Check-in, 1=Check-out


class DataFetcher:
    """
    Lấy toàn bộ log chấm công từ máy ZKTeco thông qua COM object.

    Cách dùng:
        with ConnectionManager(ip, port) as cm:
            fetcher = DataFetcher(cm.sdk)
            danh_sach = fetcher.lay_tat_ca_log()
    """

    def __init__(self, sdk):
        """
        Khởi tạo DataFetcher.

        Tham số:
            sdk: COM object zkemkeeper.ZKEM đã kết nối
        """
        self.sdk = sdk

    def lay_tat_ca_log(self) -> List[BanGhiChamCong]:
        """
        Đọc toàn bộ log chấm công từ máy (bao gồm cả log cũ trong bộ nhớ máy).

        Cơ chế:
            1. Gọi ReadAllGLogData() để tải dữ liệu vào buffer
            2. Dùng SSR_GetGeneralLogData() để duyệt từng bản ghi một
            3. Chuyển đổi sang danh sách BanGhiChamCong

        Trả về:
            Danh sách BanGhiChamCong (rỗng nếu không có hoặc lỗi)
        """
        ket_qua = []

        try:
            log_info("Đang yêu cầu máy chuẩn bị dữ liệu log (ReadAllGLogData)...")
            # Hàm này tải toàn bộ dữ liệu từ bộ nhớ máy vào buffer nội bộ của SDK
            self.sdk.ReadAllGLogData(0)

            # Biến trung gian để SDK ghi kết quả vào (truyền by-reference qua COM)
            enroll_number = ""
            verify_mode = 0
            in_out_state = 0
            year = 0
            month = 0
            day = 0
            hour = 0
            minute = 0
            second = 0
            work_code = 0

            log_info("Đang đọc từng bản ghi chấm công...")
            so_ban_ghi = 0

            # SDK trả về False khi hết dữ liệu
            while True:
                co_du_lieu = self.sdk.SSR_GetGeneralLogData(
                    0,              # Số thứ tự máy (luôn là 0)
                    enroll_number,
                    verify_mode,
                    in_out_state,
                    year,
                    month,
                    day,
                    hour,
                    minute,
                    second,
                    work_code,
                )

                if not co_du_lieu:
                    # Đã đọc hết tất cả bản ghi
                    break

                try:
                    # Phân tích thời gian từ các thành phần rời
                    thoi_gian = datetime(
                        year=year,
                        month=month,
                        day=day,
                        hour=hour,
                        minute=minute,
                        second=second,
                    )

                    ban_ghi = BanGhiChamCong(
                        enroll_number=str(enroll_number).strip(),
                        scanned_at=thoi_gian,
                        verify_type=int(verify_mode),
                        in_out_state=int(in_out_state),
                    )
                    ket_qua.append(ban_ghi)
                    so_ban_ghi += 1

                    if so_ban_ghi % 100 == 0:
                        log_info(f"  Đã đọc {so_ban_ghi} bản ghi...")

                except (ValueError, TypeError) as exc:
                    log_warn(f"  Bỏ qua bản ghi không hợp lệ: {exc}")
                    continue

            log_info(f"✓ Tổng cộng đọc được {so_ban_ghi} bản ghi chấm công.")

        except Exception as exc:
            log_error(f"Lỗi khi đọc dữ liệu từ máy chấm công: {exc}")

        return ket_qua
