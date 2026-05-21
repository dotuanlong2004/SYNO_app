"""
Module: main.py
Mục đích: Điểm khởi chạy chính của ZK Agent.
          Dùng HTTP API (/api) của Ronald Jack AI-X1 - KHÔNG dùng SDK COM.

Cách sử dụng:
  Ping kiểm tra kết nối:
    python zk_agent/main.py --ping

  Kéo toàn bộ dữ liệu và đẩy lên Supabase (1 lần):
    python zk_agent/main.py --pull

  Chạy liên tục, polling mỗi N giây:
    python zk_agent/main.py --daemon --interval 30

  Chạy ADMS push server (máy tự đẩy về khi quét):
    python zk_agent/main.py --server --port 5005

  Chạy realtime: poll getrtlog mỗi 5 giây, chỉ lấy record MỚI:
    python zk_agent/main.py --realtime --interval 5
"""

import sys
import os
import time
import logging
import argparse
from datetime import datetime

from dotenv import load_dotenv

# Thêm thư mục cha vào sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from zk_agent.http_fetcher import HttpFetcher
from zk_agent.supabase_pusher import SupabasePusher, BanGhiChamCong
from zk_agent import push_server

# Nạp biến môi trường từ file .env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


def doc_cau_hinh() -> dict:
    return {
        "machine_ip"  : os.getenv("MACHINE_IP", "192.168.0.225"),
        "machine_pwd" : os.getenv("MACHINE_PASSWORD", ""),
        "timeout"     : int(os.getenv("MACHINE_TIMEOUT_MS", "10000")) // 1000,
        "supabase_url": os.getenv("SUPABASE_URL", ""),
        "supabase_key": os.getenv("SUPABASE_KEY", ""),
        "school_id"   : os.getenv("SCHOOL_ID", "1"),
        "db_file"     : os.getenv("SQLITE_FILE", "./agent-buffer.sqlite"),
    }


def kiem_tra_cau_hinh(cfg: dict) -> bool:
    thieu = [k for k in ("machine_pwd", "supabase_url", "supabase_key") if not cfg[k]]
    if thieu:
        log.error(f"Thiếu biến môi trường: {', '.join(thieu)}")
        return False
    return True


def chay_ping(cfg: dict) -> bool:
    log.info("══ PING ══════════════════════════════════════════")
    log.info(f"  IP máy: {cfg['machine_ip']}")
    fetcher = HttpFetcher(ip=cfg["machine_ip"], password=cfg["machine_pwd"], timeout=cfg["timeout"])
    ok = fetcher.ping()
    if ok:
        log.info("✅ PING THÀNH CÔNG")
    else:
        log.error("❌ PING THẤT BẠI")
    return ok


def chay_pull(cfg: dict) -> dict:
    log.info("══ PULL ══════════════════════════════════════════")
    log.info(f"  IP máy   : {cfg['machine_ip']}")
    log.info(f"  Supabase : {cfg['supabase_url']}")
    log.info(f"  School   : {cfg['school_id']}")

    pusher = SupabasePusher(
        supabase_url=cfg["supabase_url"],
        supabase_key=cfg["supabase_key"],
        school_id=cfg["school_id"],
        db_file=cfg["db_file"],
    )
    pusher.khoi_tao_sqlite()

    fetcher = HttpFetcher(ip=cfg["machine_ip"], password=cfg["machine_pwd"], timeout=cfg["timeout"])
    danh_sach = fetcher.lay_tat_ca_log()

    if not danh_sach:
        log.warning("⚠️  Không có bản ghi nào từ máy chấm công.")
        return {"tong": 0, "thanh_cong": 0, "that_bai": 0, "bo_qua": 0}

    ket_qua = pusher.day_len_supabase(danh_sach=danh_sach, machine_ip=cfg["machine_ip"])
    return ket_qua


def chay_daemon(cfg: dict, interval_giay: int) -> None:
    log.info(f"══ DAEMON - Polling mỗi {interval_giay}s (Ctrl+C để dừng) ══")
    lan_chay = 0
    try:
        while True:
            lan_chay += 1
            log.info(f"--- Lần #{lan_chay} lúc {datetime.now().strftime('%H:%M:%S')} ---")
            chay_pull(cfg)
            log.info(f"--- Nghỉ {interval_giay}s ---\n")
            time.sleep(interval_giay)
    except KeyboardInterrupt:
        log.info("Đã dừng daemon.")


def chay_realtime(cfg: dict, interval_giay: int, enrollid: str = None) -> None:
    """
    Poll getrtlog mỗi N giây.
    Chỉ push record có scanned_at > thời điểm bắt đầu chạy hoặc > record cuối đã push.
    """
    log.info(f"══ REALTIME POLLING mỗi {interval_giay}s (Ctrl+C để dừng) ══")
    log.info(f"  IP máy   : {cfg['machine_ip']}")
    log.info(f"  Supabase : {cfg['supabase_url']}")
    log.info(f"  School   : {cfg['school_id']}")
    if enrollid:
        log.info(f"  🎯 CHỈ THEO DÕI enrollid = {enrollid}")

    pusher = SupabasePusher(
        supabase_url=cfg["supabase_url"],
        supabase_key=cfg["supabase_key"],
        school_id=cfg["school_id"],
        db_file=cfg["db_file"],
    )
    pusher.khoi_tao_sqlite()

    fetcher = HttpFetcher(ip=cfg["machine_ip"], password=cfg["machine_pwd"], timeout=cfg["timeout"])

    # last_seen theo dõi riêng cho từng enrollid: {enrollid: datetime}
    last_seen_by_id: dict = {}
    log.info(f"  Theo dõi last_seen riêng cho từng học sinh")

    lan_chay = 0
    try:
        while True:
            lan_chay += 1
            try:
                records = fetcher.lay_rtlog()
                # Lọc theo enrollid nếu có chỉ định
                if enrollid:
                    records = [r for r in records if r.enroll_number == enrollid]

                # Lọc record mới: scanned_at > last_seen của enrollid đó
                moi = []
                for r in records:
                    last = last_seen_by_id.get(r.enroll_number)
                    if last is None or r.scanned_at > last:
                        moi.append(r)
                        # Cập nhật last_seen cho enrollid này
                        last_seen_by_id[r.enroll_number] = r.scanned_at

                if moi:
                    log.info(f"[#{lan_chay}] Có {len(moi)} record mới từ {len(set(r.enroll_number for r in moi))} học sinh → đẩy Supabase")
                    ket_qua = pusher.day_len_supabase(danh_sach=moi, machine_ip=cfg["machine_ip"])
                    # Cập nhật last_seen cho từng enrollid đã push
                    for r in moi:
                        last_seen_by_id[r.enroll_number] = r.scanned_at
                    log.info(f"  → Đã cập nhật last_seen cho {len(last_seen_by_id)} học sinh")
                else:
                    log.debug(f"[#{lan_chay}] Không có record mới")

            except Exception as e:
                log.error(f"Lỗi poll lần #{lan_chay}: {e}")

            time.sleep(interval_giay)
    except KeyboardInterrupt:
        log.info("Đã dừng realtime polling.")


def chay_push_server(cfg: dict, port: int) -> None:
    log.info(f"══ PUSH SERVER ══════════════════════════════════")
    log.info(f"  Lắng nghe tại  : 0.0.0.0:{port}")
    log.info(f"  Supabase       : {cfg['supabase_url']}")
    log.info(f"  School         : {cfg['school_id']}")
    log.info(f"  Cài trên máy   : Menu > Cài đặt máy chủ > IP=[IP máy tính] Port={port}")
    push_server.run(
        supabase_url=cfg["supabase_url"],
        supabase_key=cfg["supabase_key"],
        school_id=cfg["school_id"],
        db_file=cfg["db_file"],
        host="0.0.0.0",
        port=port,
    )


def main():
    parser = argparse.ArgumentParser(
        description="ZK Agent - Lấy dữ liệu Ronald Jack AI-X1 qua HTTP API và đẩy lên Supabase"
    )
    nhom = parser.add_mutually_exclusive_group(required=True)
    nhom.add_argument("--ping",   action="store_true", help="Kiểm tra kết nối")
    nhom.add_argument("--pull",   action="store_true", help="Kéo dữ liệu 1 lần")
    nhom.add_argument("--daemon", action="store_true", help="Chạy liên tục (polling)")
    nhom.add_argument("--server",   action="store_true", help="Chạy ADMS push server (máy tự đẩy về)")
    nhom.add_argument("--realtime", action="store_true", help="Poll getrtlog liên tục, chỉ push record mới")
    parser.add_argument("--interval", type=int, default=5, help="Giây giữa các lần poll (daemon/realtime)")
    parser.add_argument("--port",     type=int, default=5005, help="Port ADMS server (default: 5005)")
    parser.add_argument("--enrollid", type=str, default=None, help="Chỉ lấy dữ liệu của enrollid cụ thể (VD: 1, 2, 123)")

    args = parser.parse_args()
    cfg = doc_cau_hinh()

    if args.ping:
        sys.exit(0 if chay_ping(cfg) else 1)

    if not kiem_tra_cau_hinh(cfg):
        sys.exit(1)

    if args.pull:
        ket_qua = chay_pull(cfg)
        sys.exit(0 if ket_qua.get("that_bai", 0) == 0 else 1)

    if args.daemon:
        chay_daemon(cfg, interval_giay=args.interval)

    if args.realtime:
        chay_realtime(cfg, interval_giay=args.interval, enrollid=args.enrollid)

    if args.server:
        chay_push_server(cfg, port=args.port)


if __name__ == "__main__":
    main()
