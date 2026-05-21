"""
ADMS Push Server - Ronald Jack AI-X1
Máy chấm công tự POST dữ liệu về đây ngay khi có người quét.
Cài trên máy: Menu > Cài đặt máy chủ > IP = [IP máy tính] > Port = 5005
"""

import os
import logging
import sqlite3
import requests
from datetime import datetime
from flask import Flask, request

log = logging.getLogger(__name__)
app = Flask(__name__)

# ─── Config (truyền vào qua push_server.run()) ────────────────
_supabase_url: str = ""
_supabase_key: str = ""
_school_id: str = ""
_db_file: str = "./agent-buffer.sqlite"
_student_cache: dict = {}  # ma_cham_cong -> student_id

# ─── Supabase headers ─────────────────────────────────────────
def _headers():
    return {
        "apikey": _supabase_key,
        "Authorization": f"Bearer {_supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

# ─── Load student mapping ──────────────────────────────────────
def _load_student_cache():
    global _student_cache
    try:
        url = f"{_supabase_url}/rest/v1/students?select=id,ma_cham_cong&ma_cham_cong=not.is.null"
        resp = requests.get(url, headers=_headers(), timeout=10)
        if resp.status_code == 200:
            _student_cache = {
                row["ma_cham_cong"]: row["id"]
                for row in resp.json()
                if row.get("ma_cham_cong")
            }
            log.info(f"Đã tải {len(_student_cache)} mapping ma_cham_cong -> student_id")
        else:
            log.error(f"Lỗi tải student map: {resp.status_code}")
    except Exception as e:
        log.error(f"Lỗi kết nối Supabase khi tải student map: {e}")

# ─── SQLite buffer ─────────────────────────────────────────────
def _init_sqlite():
    conn = sqlite3.connect(_db_file)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS push_logs (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            pin           TEXT NOT NULL,
            time_str      TEXT NOT NULL,
            school_id     TEXT NOT NULL,
            is_synced     INTEGER DEFAULT 0,
            created_at    TEXT DEFAULT (datetime('now','localtime')),
            UNIQUE(pin, time_str, school_id)
        )
    """)
    conn.commit()
    conn.close()

def _save_to_sqlite(pin: str, time_str: str):
    try:
        conn = sqlite3.connect(_db_file)
        conn.execute(
            "INSERT OR IGNORE INTO push_logs (pin, time_str, school_id) VALUES (?,?,?)",
            (pin, time_str, _school_id),
        )
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        log.error(f"Lỗi ghi SQLite: {e}")

def _mark_synced(pin: str, time_str: str):
    try:
        conn = sqlite3.connect(_db_file)
        conn.execute(
            "UPDATE push_logs SET is_synced=1 WHERE pin=? AND time_str=? AND school_id=?",
            (pin, time_str, _school_id),
        )
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        log.error(f"Lỗi update SQLite: {e}")

# ─── Push to Supabase ──────────────────────────────────────────
def _push_to_supabase(pin: str, time_str: str, status: int) -> bool:
    student_id = _student_cache.get(pin)
    if student_id is None:
        log.warning(f"Không tìm thấy student với ma_cham_cong='{pin}' — bỏ qua")
        return False

    log_type = "check_out" if status == 1 else "check_in"

    try:
        scanned_at = datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S").isoformat()
    except ValueError:
        scanned_at = time_str

    payload = {
        "school_id"    : _school_id,
        "student_id"   : student_id,
        "scanned_at"   : scanned_at,
        "log_type"     : log_type,
        "status_detail": "on_time",
    }

    try:
        resp = requests.post(
            f"{_supabase_url}/rest/v1/attendance_logs",
            json=payload,
            headers=_headers(),
            timeout=10,
        )
        if resp.status_code in (200, 201, 409):
            log.info(f"✓ PUSH student_id={student_id} @ {time_str} [{log_type}]")
            return True
        log.error(f"Supabase từ chối [{resp.status_code}]: {resp.text[:200]}")
        return False
    except requests.exceptions.RequestException as e:
        log.error(f"Lỗi request Supabase: {e}")
        return False

# ─── Parse ADMS text format ────────────────────────────────────
def _parse_adms(raw: str) -> list:
    """
    ADMS ATTLOG format thực tế (tab-separated positional):
      UserID\tTimestamp\tStatus\tVerifyMode\tWorkCode
    Ví dụ:
      123\t2024-01-01 08:00:00\t0\t1\t0
    """
    records = []
    for line in raw.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split("\t")
        if len(parts) >= 2:
            rec = {
                "_type"  : "ATTLOG",
                "Pin"    : parts[0].strip(),
                "Time"   : parts[1].strip(),
                "Status" : int(parts[2].strip()) if len(parts) > 2 else 0,
                "Verify" : int(parts[3].strip()) if len(parts) > 3 else 0,
            }
            records.append(rec)
            log.info(f"  → ATTLOG parse: Pin={rec['Pin']} Time={rec['Time']} Status={rec['Status']}")
    return records

# ─── Catch-all: log mọi request để debug ─────────────────────

@app.route("/", defaults={"path": ""}, methods=["GET", "POST"])
@app.route("/<path:path>", methods=["GET", "POST"])
def catch_all(path):
    log.info(f"📨 {request.method} /{path} | IP={request.remote_addr}")
    log.info(f"   Args: {dict(request.args)}")
    body = request.get_data(as_text=True)
    if body:
        log.info(f"   Body: {body[:300]}")
    # Chuyển tiếp đúng handler nếu có
    if path == "iclock/getrequest":
        return adms_getrequest_handler()
    if path == "iclock/cdata":
        return adms_cdata_handler()
    if path == "iclock/registry":
        return adms_registry_handler()
    if path == "iclock/devicecmd":
        log.info(f"   DeviceCmd body: {body[:200]}")
        return "OK", 200, {"Content-Type": "text/plain"}
    return "OK", 200, {"Content-Type": "text/plain"}


# ─── ADMS Endpoints ────────────────────────────────────────────

def adms_getrequest_handler():
    """Heartbeat — máy gọi định kỳ, trả về lệnh nếu có."""
    sn = request.args.get("SN", "UNKNOWN")
    log.info(f"💓 Heartbeat SN={sn} IP={request.remote_addr}")
    # Response chuẩn ADMS: trống = không có lệnh
    return "", 200, {"Content-Type": "text/plain"}


@app.route("/iclock/getrequest", methods=["GET"])
def adms_getrequest():
    return adms_getrequest_handler()


@app.route("/iclock/registry", methods=["GET", "POST"])
def adms_registry():
    return adms_registry_handler()


def adms_registry_handler():
    """Máy đăng ký lần đầu kết nối."""
    sn = request.args.get("SN", request.form.get("SN", "UNKNOWN"))
    body = request.get_data(as_text=True)
    log.info(f"📋 Registry SN={sn} IP={request.remote_addr}")
    if body:
        log.info(f"   Registry payload: {body[:300]}")
    return "OK", 200, {"Content-Type": "text/plain"}


def adms_cdata_handler():
    """Nhận dữ liệu chấm công từ máy."""
    sn    = request.args.get("SN", request.form.get("SN", "UNKNOWN"))
    table = request.args.get("table", request.form.get("table", ""))

    if request.method == "GET":
        if table == "templateinfo":
            return "ADD-NUM: 0\n", 200, {"Content-Type": "text/plain"}
        return "OK", 200, {"Content-Type": "text/plain"}

    raw_body = request.get_data(as_text=True)
    log.info(f"   POST cdata SN={sn} table={table}")
    if raw_body:
        log.info(f"   Raw body: {repr(raw_body[:300])}")

    if not raw_body.strip():
        return "OK", 200, {"Content-Type": "text/plain"}

    records = _parse_adms(raw_body)
    ok_count = 0

    for rec in records:
        if rec.get("_type") != "ATTLOG":
            continue

        pin      = rec.get("Pin", "").strip()
        time_str = rec.get("Time", "").strip()
        status   = int(rec.get("Status", 0))

        if not pin or not time_str:
            continue

        _save_to_sqlite(pin, time_str)

        if _push_to_supabase(pin, time_str, status):
            _mark_synced(pin, time_str)
            ok_count += 1

    now = datetime.now().strftime("%H:%M:%S")
    log.info(f"[{now}] SN={sn} | {len(records)} records | {ok_count} pushed OK")
    return f"OK: {ok_count}", 200, {"Content-Type": "text/plain"}


@app.route("/iclock/cdata", methods=["GET", "POST"])
def adms_cdata():
    return adms_cdata_handler()


# ─── Khởi động ────────────────────────────────────────────────

def run(
    supabase_url: str,
    supabase_key: str,
    school_id: str,
    db_file: str = "./agent-buffer.sqlite",
    host: str = "0.0.0.0",
    port: int = 5005,
):
    global _supabase_url, _supabase_key, _school_id, _db_file

    _supabase_url = supabase_url.rstrip("/")
    _supabase_key = supabase_key
    _school_id    = school_id
    _db_file      = db_file

    _init_sqlite()
    _load_student_cache()

    log.info(f"ADMS Push Server khởi động tại http://{host}:{port}")
    log.info(f"Cài trên máy chấm công: IP={host}  Port={port}")
    app.run(host=host, port=port, debug=False, threaded=True)
