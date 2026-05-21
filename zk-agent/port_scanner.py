import socket, threading, datetime

PORTS = [5005, 5010, 5020, 5050, 5055, 8080, 8888, 9090, 4370, 80, 443, 8000]

def listen(port):
    try:
        srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind(('0.0.0.0', port))
        srv.listen(3)
        while True:
            conn, addr = srv.accept()
            now = datetime.datetime.now().strftime('%H:%M:%S')
            print(f"\n*** [{now}] KET NOI TAI PORT {port} tu {addr[0]} ***")
            try:
                data = conn.recv(4096)
                if data:
                    print(f"  HEX : {data.hex()[:200]}")
                    print(f"  TEXT: {data.decode('utf-8', errors='replace')[:300]}")
                conn.send(b'OK')
            except:
                pass
            conn.close()
    except OSError as e:
        print(f"Port {port} bi chiem: {e}")

print(f"Lang nghe tren cac port: {PORTS}")
print("Cho may cham cong gui du lieu...\n")

threads = []
for p in PORTS:
    t = threading.Thread(target=listen, args=(p,), daemon=True)
    t.start()
    threads.append(t)

try:
    for t in threads:
        t.join()
except KeyboardInterrupt:
    print("Dung.")
