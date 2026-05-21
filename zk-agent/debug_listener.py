"""
DEBUG LISTENER - Bắt TẤT CẢ request từ máy chấm công
Chạy: python debug_listener.py
Sau đó bật máy chấm công, để nó kết nối → xem log

Lắng nghe đồng thời:
  - TCP raw  port 5005  (in hex + ASCII)
  - HTTP     port 8888  (in toàn bộ headers + body)
"""
import socket
import threading
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler

# ── Đổi port tại đây nếu cần ──────────────────────────────────
TCP_PORT  = 5005
HTTP_PORT = 8888


def ts():
    return datetime.now().strftime("%H:%M:%S.%f")[:-3]


# ══════════════════════════════════════════════════
# TCP RAW SERVER
# ══════════════════════════════════════════════════
def handle_tcp_client(conn, addr):
    print(f"\n[{ts()}] [TCP] KẾT NỐI từ {addr[0]}:{addr[1]}")
    try:
        while True:
            data = conn.recv(4096)
            if not data:
                break
            print(f"[{ts()}] [TCP] Nhận {len(data)} bytes")
            print(f"   HEX  : {data.hex()}")
            try:
                print(f"   ASCII: {repr(data.decode('ascii', errors='replace'))}")
            except Exception:
                pass
            # Gửi ACK đơn giản để máy tiếp tục gửi
            conn.send(b"OK")
    except Exception as e:
        print(f"[{ts()}] [TCP] Lỗi: {e}")
    finally:
        conn.close()
        print(f"[{ts()}] [TCP] NGẮT KẾT NỐI {addr[0]}")


def run_tcp_server():
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        srv.bind(("0.0.0.0", TCP_PORT))
        srv.listen(5)
        print(f"[TCP] Đang lắng nghe port {TCP_PORT}")
        while True:
            conn, addr = srv.accept()
            t = threading.Thread(target=handle_tcp_client, args=(conn, addr), daemon=True)
            t.start()
    except OSError as e:
        print(f"[TCP] Không mở được port {TCP_PORT}: {e}")


# ══════════════════════════════════════════════════
# HTTP SERVER
# ══════════════════════════════════════════════════
class DebugHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # tắt log mặc định

    def _dump(self):
        print(f"\n[{ts()}] [HTTP] {self.command} {self.path}")
        print(f"   IP     : {self.client_address[0]}")
        print(f"   Headers:")
        for k, v in self.headers.items():
            print(f"     {k}: {v}")
        length = int(self.headers.get("Content-Length", 0))
        if length:
            body = self.rfile.read(length)
            print(f"   Body   : {repr(body.decode('utf-8', errors='replace'))}")
        else:
            print(f"   Body   : (trống)")

    def do_GET(self):
        self._dump()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"OK")

    def do_POST(self):
        self._dump()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"OK")


def run_http_server():
    srv = HTTPServer(("0.0.0.0", HTTP_PORT), DebugHandler)
    print(f"[HTTP] Đang lắng nghe port {HTTP_PORT}")
    srv.serve_forever()


# ══════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════
if __name__ == "__main__":
    import os
    # In IP của máy để dễ cài vào máy chấm công
    import socket as _s
    hostname = _s.gethostname()
    try:
        local_ip = _s.gethostbyname(hostname)
    except Exception:
        local_ip = "???"

    print("=" * 55)
    print("  DEBUG LISTENER - Máy chấm công Ronald Jack AI-X1")
    print("=" * 55)
    print(f"  IP máy tính này : {local_ip}")
    print(f"  TCP port        : {TCP_PORT}  ← cài vào máy chấm công")
    print(f"  HTTP port       : {HTTP_PORT} ← thử nếu máy dùng HTTP")
    print("=" * 55)
    print("Bật máy chấm công, cài IP server =", local_ip)
    print("Đợi kết nối...")
    print()

    t1 = threading.Thread(target=run_tcp_server, daemon=True)
    t2 = threading.Thread(target=run_http_server, daemon=True)
    t1.start()
    t2.start()

    try:
        t1.join()
    except KeyboardInterrupt:
        print("\nDừng.")
