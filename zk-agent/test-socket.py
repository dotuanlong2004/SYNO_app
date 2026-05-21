#!/usr/bin/env python3
"""
Test ket noi socket thu den may cham cong
"""

import socket
import sys

MACHINE_IP = "192.168.0.225"
MACHINE_PORT = 4370

def test_socket():
    print(f"Dang ket noi den {MACHINE_IP}:{MACHINE_PORT}...")
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        sock.connect((MACHINE_IP, MACHINE_PORT))
        print("✓ Ket noi thanh cong!")
        
        # Thu nhan du lieu
        print("Dang doi du lieu...")
        data = sock.recv(1024)
        print(f"Nhan duoc: {data.hex()}")
        print(f"Raw: {data}")
        
        sock.close()
        return True
    except Exception as e:
        print(f"✗ Loi: {e}")
        return False

if __name__ == '__main__':
    test_socket()
