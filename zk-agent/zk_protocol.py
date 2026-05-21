#!/usr/bin/env python3
"""
ZK Protocol thu - Giao tiep truc tiep voi may cham cong
"""

import socket
import struct
import json
import sqlite3
import requests
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

MACHINE_IP = os.getenv('MACHINE_IP', '192.168.0.225')
MACHINE_PORT = int(os.getenv('MACHINE_PORT', '4370'))
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '')
SUPABASE_TABLE = os.getenv('SUPABASE_TABLE', 'attendance_spam_logs')
DB_FILE = os.getenv('SQLITE_FILE', './agent-buffer.sqlite')

# ZK Protocol Constants
CMD_CONNECT = 0x00
CMD_EXIT = 0x05
CMD_GET_ATTENDANCE_LOG = 0x0D
CMD_CLEAR_ATTENDANCE_LOG = 0x09

def log_info(msg):
    print(f"{datetime.now().isoformat()} [INFO] {msg}")

def log_error(msg):
    print(f"{datetime.now().isoformat()} [ERROR] {msg}")

def make_packet(command, data=b''):
    """Tao ZK packet"""
    header = b'\xef\x01'
    length = struct.pack('<H', len(data) + 1)
    cmd = bytes([command])
    checksum = bytes([sum(data + cmd) & 0xFF])
    return header + length + cmd + data + checksum

def parse_packet(data):
    """Parse ZK packet"""
    if len(data) < 8:
        return None
    if data[0:2] != b'\xef\x01':
        return None
    length = struct.unpack('<H', data[2:4])[0]
    command = data[4]
    payload = data[5:5+length-1]
    return {'command': command, 'payload': payload}

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS local_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            enroll_number TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            is_synced INTEGER NOT NULL DEFAULT 0,
            payload TEXT NOT NULL,
            machine_ip TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            synced_at TEXT,
            UNIQUE (enroll_number, timestamp, machine_ip)
        )
    ''')
    conn.commit()
    conn.close()

def push_to_supabase(enroll_number, timestamp, raw_data):
    if not SUPABASE_URL or not SUPABASE_KEY:
        log_error("Thieu SUPABASE_URL hoac SUPABASE_KEY")
        return False
    
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}"
    headers = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Prefer': 'return=minimal'
    }
    payload = {
        'student_code': enroll_number,
        'created_at': timestamp,
        'source': 'zk-protocol',
        'machine_ip': MACHINE_IP,
        'raw_data': raw_data
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code in [200, 201]:
            log_info(f"✓ Gui thanh cong: {enroll_number}")
            return True
        else:
            log_error(f"✗ Loi HTTP {response.status_code}")
            return False
    except Exception as e:
        log_error(f"✗ Loi request: {e}")
        return False

def pull_attendance():
    log_info(f"Dang ket noi den {MACHINE_IP}:{MACHINE_PORT}...")
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(30)
    
    try:
        sock.connect((MACHINE_IP, MACHINE_PORT))
        log_info("✓ Ket noi thanh cong!")
        
        # Gui lệnh connect
        log_info("Dang gui lenh CONNECT...")
        sock.send(make_packet(CMD_CONNECT))
        response = sock.recv(1024)
        log_info(f"Response: {response.hex()}")
        
        # Gui lệnh lấy attendance logs
        log_info("Dang gui lenh GET_ATTENDANCE_LOG...")
        sock.send(make_packet(CMD_GET_ATTENDANCE_LOG))
        
        # Nhan du lieu
        log_info("Dang nhan du lieu...")
        all_data = b''
        while True:
            try:
                data = sock.recv(4096)
                if not data:
                    break
                all_data += data
                log_info(f"Nhan duoc {len(data)} bytes")
            except socket.timeout:
                break
        
        log_info(f"Tong: {len(all_data)} bytes")
        log_info(f"Hex: {all_data.hex()[:200]}...")
        
        # Parse du lieu
        # ZK attendance format: 6 bytes header + data
        # Record: user_id (4 bytes) + timestamp (4 bytes) + status (1 byte) + verify (1 byte)
        idx = 0
        count = 0
        
        while idx + 10 < len(all_data):
            # Thu parse record
            try:
                user_id = struct.unpack('<I', all_data[idx:idx+4])[0]
                timestamp_raw = all_data[idx+4:idx+8]
                status = all_data[idx+8]
                
                # Convert timestamp (ZK uses Unix timestamp)
                timestamp_sec = struct.unpack('<I', timestamp_raw)[0]
                timestamp = datetime.fromtimestamp(timestamp_sec).isoformat()
                
                enroll_number = str(user_id)
                
                if enroll_number != '0':
                    log_info(f"✓ Phat hien: {enroll_number} @ {timestamp}")
                    
                    # Gui Supabase
                    raw_data = json.dumps({
                        'user_id': user_id,
                        'timestamp': timestamp,
                        'status': status
                    })
                    push_to_supabase(enroll_number, timestamp, raw_data)
                    count += 1
                
                idx += 10
            except:
                idx += 1
        
        log_info(f"✓ Hoan tat! Da xu ly {count} ban ghi")
        
        # Disconnect
        sock.send(make_packet(CMD_EXIT))
        
        return True
        
    except Exception as e:
        log_error(f"Loi: {e}")
        return False
    finally:
        sock.close()

if __name__ == '__main__':
    log_info("========================================")
    log_info("ZK Protocol Tool")
    log_info("========================================")
    init_db()
    pull_attendance()
