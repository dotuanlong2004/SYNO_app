#!/usr/bin/env python3
"""
Test ket noi UDP den may cham cong
"""

import socket
import sys

MACHINE_IP = "192.168.0.225"
MACHINE_PORT = 4370

def test_udp():
    print(f"Dang ket noi UDP den {MACHINE_IP}:{MACHINE_PORT}...")
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(10)
        
        # Gui test packet
        test_data = b'\xef\x01\x00\x00\x00\x00'
        sock.sendto(test_data, (MACHINE_IP, MACHINE_PORT))
        print("Da gui test packet")
        
        # Nhan du lieu
        print("Dang doi du lieu...")
        data, addr = sock.recvfrom(1024)
        print(f"✓ Nhan duoc tu {addr}: {data.hex()}")
        print(f"Raw: {data}")
        
        sock.close()
        return True
    except socket.timeout:
        print("✗ Timeout - khong co phan hoi")
        return False
    except Exception as e:
        print(f"✗ Loi: {e}")
        return False

if __name__ == '__main__':
    test_udp()
