"""
Module: supabase_pusher.py
Mục đích: Đẩy dữ liệu chấm công từ Ronald Jack AI-X1 lên bảng attendance_logs.

Schema bảng attendance_logs (đã xác minh qua MCP):
  id          BIGINT PK
  school_id   VARCHAR NOT NULL
  student_id  BIGINT FK -> students.id
  scanned_at  TIMESTAMPTZ NOT NULL
  log_type    VARCHAR ('check_in' | 'check_out')
  status_detail VARCHAR ('on_time' | 'late' | 'leave')
  late_minutes  INT nullable
  created_by  UUID nullable
  created_at  TIMESTAMPTZ

Lookup: ma_cham_cong (enroll_number từ máy) -> student_id trong bảng students
"""

import sqlite3
import logging
import requests
from datetime import datetime
from typing import Dict, List, Optional

from .http_fetcher import BanGhiChamCong

log = logging.getLogger(__name__)

log_info  = log.info
log_error = log.error
log_warn  = log.warning


class SupabasePusher:

    BANG_ATT = "attendance_logs"
    BANG_STUDENTS = "students"

    def __init__(
        self,
        supabase_url: str,
        supabase_key: str,
        school_id: str,
        db_file: str = "./agent-buffer.sqlite",
    ):
        self.supabase_url = supabase_url.rstrip("/")
        self.supabase_key = supabase_key
        self.school_id = school_id
        self.db_file = db_file
        self._headers = {
            "Content-Type": "application/json",
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Prefer": "return=minimal",
        }
        self._student_cache: Dict[str, int] = {}

    # ─── SQLite buffer ────────────────────────────────────────────────

    def khoi_tao_sqlite(self) -> None:
        try:
            conn = sqlite3.connect(self.db_file)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS local_logs (
                    id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    enroll_number TEXT NOT NULL,
                    time_str      TEXT NOT NULL,
                    school_id     TEXT NOT NULL,
                    machine_ip    TEXT NOT NULL DEFAULT '',
                    is_synced     INTEGER NOT NULL DEFAULT 0,
                    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
                    synced_at     TEXT,
                    UNIQUE (enroll_number, time_str, school_id)
                )
            """)
            conn.commit()
            conn.close()
            log_info(f"SQLite buffer sẵn sàng: {self.db_file}")
        except sqlite3.Error as exc:
            log_error(f"Lỗi khởi tạo SQLite: {exc}")
            raise

    def _luu_sqlite(self, ban_ghi: BanGhiChamCong, machine_ip: str) -> None:
        try:
            conn = sqlite3.connect(self.db_file)
            conn.execute(
                "INSERT OR IGNORE INTO local_logs (enroll_number, time_str, school_id, machine_ip) VALUES (?,?,?,?)",
                (ban_ghi.enroll_number, ban_ghi.scanned_at.isoformat(), self.school_id, machine_ip),
            )
            conn.commit()
            conn.close()
        except sqlite3.Error as exc:
            log_error(f"Lỗi ghi SQLite: {exc}")

    def _da_synced_sqlite(self, enroll_number: str, time_str: str) -> bool:
        """Kiểm tra bản ghi đã được sync thành công trong SQLite chưa."""
        try:
            conn = sqlite3.connect(self.db_file)
            cur = conn.execute(
                "SELECT is_synced FROM local_logs WHERE enroll_number=? AND time_str=? AND school_id=? LIMIT 1",
                (enroll_number, time_str, self.school_id),
            )
            row = cur.fetchone()
            conn.close()
            return row is not None and row[0] == 1
        except sqlite3.Error:
            return False

    def _danh_dau_synced(self, enroll_number: str, time_str: str) -> None:
        try:
            conn = sqlite3.connect(self.db_file)
            conn.execute(
                "UPDATE local_logs SET is_synced=1, synced_at=datetime('now') WHERE enroll_number=? AND time_str=? AND school_id=?",
                (enroll_number, time_str, self.school_id),
            )
            conn.commit()
            conn.close()
        except sqlite3.Error as exc:
            log_warn(f"Không đánh dấu synced được: {exc}")

    # ─── Lookup student_id ────────────────────────────────────────────

    def _tai_student_map(self) -> None:
        """Tải toàn bộ mapping ma_cham_cong -> student_id vào cache."""
        url = (
            f"{self.supabase_url}/rest/v1/{self.BANG_STUDENTS}"
            f"?school_id=eq.{self.school_id}&select=id,ma_cham_cong&ma_cham_cong=not.is.null"
        )
        try:
            resp = requests.get(url, headers=self._headers, timeout=15)
            if resp.status_code == 200:
                for row in resp.json():
                    if row.get("ma_cham_cong"):
                        self._student_cache[str(row["ma_cham_cong"])] = int(row["id"])
                log_info(f"Đã tải {len(self._student_cache)} mapping ma_cham_cong -> student_id")
            else:
                log_error(f"Không tải được student map: [{resp.status_code}] {resp.text[:200]}")
        except requests.exceptions.RequestException as exc:
            log_error(f"Lỗi kết nối Supabase khi tải student map: {exc}")

    def _tim_student_id(self, enroll_number: str) -> Optional[int]:
        return self._student_cache.get(enroll_number)

    # ─── Gửi lên Supabase ────────────────────────────────────────────

    def _da_ton_tai(self, student_id: int, scanned_at_iso: str) -> bool:
        """Kiểm tra bản ghi đã có trong Supabase chưa (tránh duplicate)."""
        url = (
            f"{self.supabase_url}/rest/v1/{self.BANG_ATT}"
            f"?student_id=eq.{student_id}&scanned_at=eq.{scanned_at_iso}&select=id&limit=1"
        )
        try:
            resp = requests.get(url, headers=self._headers, timeout=10)
            if resp.status_code == 200:
                return len(resp.json()) > 0
            return False
        except requests.exceptions.RequestException:
            return False

    def _insert_attendance_log(
        self, student_id: int, scanned_at_iso: str, log_type: str = "check_in"
    ) -> bool:
        url = f"{self.supabase_url}/rest/v1/{self.BANG_ATT}"
        payload = {
            "school_id"    : self.school_id,
            "student_id"   : student_id,
            "scanned_at"   : scanned_at_iso,
            "log_type"     : log_type,
            "status_detail": "on_time",
        }
        try:
            resp = requests.post(url, json=payload, headers=self._headers, timeout=15)
            if resp.status_code in (200, 201):
                return True
            if resp.status_code == 409:
                return True
            log_error(f"Supabase từ chối [{resp.status_code}]: {resp.text[:300]}")
            return False
        except requests.exceptions.ConnectionError:
            log_error("Mất kết nối Supabase.")
            return False
        except requests.exceptions.Timeout:
            log_error("Supabase timeout.")
            return False
        except requests.exceptions.RequestException as exc:
            log_error(f"Lỗi request: {exc}")
            return False

    # ─── Hàm chính ────────────────────────────────────────────────────

    def day_len_supabase(
        self,
        danh_sach: List[BanGhiChamCong],
        machine_ip: str = "",
    ) -> dict:
        if not self.supabase_url or not self.supabase_key:
            log_error("Thiếu SUPABASE_URL hoặc SUPABASE_KEY.")
            return {"tong": 0, "thanh_cong": 0, "that_bai": 0, "bo_qua": 0}

        # Tải mapping một lần
        self._tai_student_map()

        tong = len(danh_sach)
        thanh_cong = 0
        that_bai = 0
        bo_qua = 0

        log_info(f"Bắt đầu đẩy {tong} bản ghi lên Supabase...")

        for i, ban_ghi in enumerate(danh_sach):
            label = f"[{i+1}/{tong}]"

            if not ban_ghi.enroll_number:
                log_warn(f"  {label} Bỏ qua: không có enroll_number")
                bo_qua += 1
                continue

            scanned_at_iso = ban_ghi.scanned_at.isoformat()

            # Lưu buffer trước
            self._luu_sqlite(ban_ghi, machine_ip)

            # Dedup: bỏ qua nếu đã synced trong SQLite
            if self._da_synced_sqlite(ban_ghi.enroll_number, scanned_at_iso):
                bo_qua += 1
                continue

            # Lookup student_id
            student_id = self._tim_student_id(ban_ghi.enroll_number)
            if student_id is None:
                log_warn(f"  {label} Bỏ qua: không tìm thấy student với ma_cham_cong='{ban_ghi.enroll_number}'")
                bo_qua += 1
                continue

            log_type = "check_out" if ban_ghi.inout == 1 else "check_in"

            ok = self._insert_attendance_log(student_id, scanned_at_iso, log_type)
            if ok:
                self._danh_dau_synced(ban_ghi.enroll_number, scanned_at_iso)
                thanh_cong += 1
                log_info(f"  {label} ✓ student_id={student_id} | {ban_ghi.name} @ {ban_ghi.scanned_at.strftime('%d/%m %H:%M:%S')} [{log_type}]")
            else:
                that_bai += 1
                log_warn(f"  {label} ✗ Thất bại: student_id={student_id}")

        log_info(f"Hoàn tất: {thanh_cong} thành công | {that_bai} thất bại | {bo_qua} bỏ qua / {tong} tổng")
        return {"tong": tong, "thanh_cong": thanh_cong, "that_bai": that_bai, "bo_qua": bo_qua}
