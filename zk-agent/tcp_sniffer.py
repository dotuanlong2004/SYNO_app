import socket, datetime

srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(('0.0.0.0', 5005))
srv.listen(5)
print(f"[{datetime.datetime.now():%H:%M:%S}] TCP listener on 0.0.0.0:5005 - cho may cham cong gui du lieu...")

while True:
    conn, addr = srv.accept()
    print(f"\n[{datetime.datetime.now():%H:%M:%S}] KET NOI tu {addr[0]}:{addr[1]}")
    try:
        while True:
            data = conn.recv(4096)
            if not data:
                break
            print(f"  HEX : {data.hex()}")
            print(f"  TEXT: {data.decode('utf-8', errors='replace')[:500]}")
            conn.send(b'OK')
    except Exception as e:
        print(f"  LOI: {e}")
    finally:
        conn.close()
