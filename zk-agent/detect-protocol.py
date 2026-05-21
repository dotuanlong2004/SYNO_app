#!/usr/bin/env python3
"""
Detect Ronald Jack AI-X1 protocol
"""

import socket
import sys

MACHINE_IP = "192.168.0.225"
PORTS = [4370, 5005, 80, 8080, 443]

def test_tcp_port(port):
    print(f"\n[Testing TCP port {port}...]")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        sock.connect((MACHINE_IP, port))
        print(f"  OK: Port {port} is OPEN")
        
        # Try to receive banner
        try:
            data = sock.recv(1024)
            if data:
                print(f"  Banner: {data[:100]}")
        except:
            pass
        
        sock.close()
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False

def test_udp_port(port):
    print(f"\n[Testing UDP port {port}...]")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(5)
        
        # Send test packet
        test_data = b'\xef\x01\x00\x00\x00\x00'
        sock.sendto(test_data, (MACHINE_IP, port))
        
        # Try to receive
        try:
            data, addr = sock.recvfrom(1024)
            print(f"  OK: UDP response from {addr}: {data[:50]}")
            return True
        except socket.timeout:
            print(f"  TIMEOUT: No UDP response")
            return False
    except Exception as e:
        print(f"  FAIL: {e}")
        return False

def main():
    print("=" * 50)
    print("Protocol Detection for Ronald Jack AI-X1")
    print(f"Target: {MACHINE_IP}")
    print("=" * 50)
    
    # Test TCP ports
    print("\n=== TCP Ports ===")
    for port in PORTS:
        test_tcp_port(port)
    
    # Test UDP on common ZK port
    print("\n=== UDP Ports ===")
    test_udp_port(4370)
    
    print("\n" + "=" * 50)
    print("Check device settings:")
    print("  Menu -> Communication -> TCP/IP settings")
    print("  Menu -> Communication -> Server settings")
    print("=" * 50)

if __name__ == '__main__':
    main()
