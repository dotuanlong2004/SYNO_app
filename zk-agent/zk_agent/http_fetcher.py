"""
Module: http_fetcher.py
Mục đích: Lấy dữ liệu chấm công từ Ronald Jack AI-X1 qua HTTP API (/api).

API đã xác minh hoạt động:
  POST http://<ip>/api  {"cmd": "getlog", "password": "<pwd>"}
  -> {"result": true, "count": 32, "record": [...]}

Mỗi record gồm: enrollid, name, time, mode, inout, event
"""

import urllib.request
import json
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

log = logging.getLogger(__name__)


@dataclass
class BanGhiChamCong:
    enroll_number: str
    scanned_at: datetime
    name: str = ""
    inout: int = 0
    mode: int = 0


class HttpFetcher:
    """
    Kết nối và lấy log từ Ronald Jack AI-X1 qua HTTP API.
    Không cần SDK, không cần COM object.
    """

    def __init__(self, ip: str, password: str, timeout: int = 10):
        self.base_url = f"http://{ip}"
        self.password = password
        self.timeout = timeout
        self._logged_in = False

    def _api(self, payload: dict) -> Optional[dict]:
        """Gửi POST JSON tới /api, trả về dict hoặc None nếu lỗi."""
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.base_url + "/api",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        try:
            resp = urllib.request.urlopen(req, timeout=self.timeout)
            return json.loads(resp.read().decode("utf-8", errors="ignore"))
        except urllib.error.URLError as e:
            log.error(f"HTTP lỗi kết nối tới {self.base_url}/api: {e}")
            return None
        except json.JSONDecodeError as e:
            log.error(f"Lỗi parse JSON từ máy: {e}")
            return None

    def ping(self) -> bool:
        """Kiểm tra kết nối: login thử, trả True nếu thành công."""
        r = self._api({"cmd": "login", "username": "admin", "password": self.password, "rememberMe": False})
        if r and r.get("result") is True:
            log.info(f"Ping OK - SN máy: {r.get('sn', 'unknown')}")
            return True
        log.error(f"Ping thất bại: {r}")
        return False

    def lay_tat_ca_log(self) -> List[BanGhiChamCong]:
        """
        Lấy toàn bộ log chấm công từ bộ nhớ máy.
        Dùng cmd='getlog' với password.
        Trả về danh sách BanGhiChamCong.
        """
        r = self._api({"cmd": "getlog", "password": self.password})
        if not r:
            log.error("Không nhận được phản hồi từ máy.")
            return []

        if not r.get("result"):
            log.error(f"Máy từ chối getlog: {r}")
            return []

        records = r.get("record", [])
        count = r.get("count", 0)
        log.info(f"Máy trả về {count} bản ghi.")

        ket_qua: List[BanGhiChamCong] = []
        for rec in records:
            try:
                scanned_at = datetime.strptime(rec["time"], "%Y-%m-%d %H:%M:%S")
                ket_qua.append(BanGhiChamCong(
                    enroll_number=str(rec["enrollid"]),
                    scanned_at=scanned_at,
                    name=rec.get("name", ""),
                    inout=int(rec.get("inout", 0)),
                    mode=int(rec.get("mode", 0)),
                ))
            except (KeyError, ValueError) as e:
                log.warning(f"Bỏ qua record lỗi: {rec} | {e}")

        return ket_qua

    def lay_rtlog(self) -> List[BanGhiChamCong]:
        """
        Lấy log realtime (mới nhất) từ máy.
        Dùng cmd='getrtlog' với password - trả về các lần quẹt gần nhất.
        """
        r = self._api({"cmd": "getrtlog", "password": self.password})
        if not r or not r.get("result"):
            return []

        records = r.get("record", [])
        ket_qua: List[BanGhiChamCong] = []
        for rec in records:
            try:
                scanned_at = datetime.strptime(rec["time"], "%Y-%m-%d %H:%M:%S")
                ket_qua.append(BanGhiChamCong(
                    enroll_number=str(rec["enrollid"]),
                    scanned_at=scanned_at,
                    name=rec.get("name", ""),
                    inout=int(rec.get("inout", 0)),
                    mode=int(rec.get("mode", 0)),
                ))
            except (KeyError, ValueError) as e:
                log.warning(f"Bỏ qua rtlog record lỗi: {rec} | {e}")
        return ket_qua
