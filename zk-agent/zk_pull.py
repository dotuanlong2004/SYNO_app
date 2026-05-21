#!/usr/bin/env python3
"""
ZKTeco Pull Tool - Lay du lieu tu may cham cong qua TCP
Va day len Supabase
"""

import os
import sys
import json
import sqlite3
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load config
load_dotenv()

MACHINE_IP = os.getenv('MACHINE_IP', '192.168.0.225')
MACHINE_PORT = int(os.getenv('MACHINE_PORT', '4370'))
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '')
SUPABASE_TABLE = os.getenv('SUPABASE_TABLE', 'attendance_spam_logs')
DB_FILE = os.getenv('SQLITE_FILE', './agent-buffer.sqlite')

def log_info(msg):
    print(f"{datetime.now().isoformat()} [INFO] {msg}")

def log_error(msg):
    print(f"{datetime.now().isoformat()} [ERROR] {msg}")

def init_db():
    """Khoi tao SQLite"""
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
    log_info("SQLite initialized")

def push_to_supabase(enroll_number, timestamp, raw_data):
    """Gui du lieu len Supabase"""
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
        'source': 'zk-python',
        'machine_ip': MACHINE_IP,
        'raw_data': raw_data
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code in [200, 201]:
            log_info(f"✓ Gui thanh cong: {enroll_number} @ {timestamp}")
            return True
        else:
            log_error(f"✗ Loi HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_error(f"✗ Loi request: {e}")
        return False

def save_local(enroll_number, timestamp, raw_data):
    """Luu vao SQLite"""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT OR IGNORE INTO local_logs (enroll_number, timestamp, is_synced, payload, machine_ip)
        VALUES (?, ?, 0, ?, ?)
    ''', (enroll_number, timestamp, raw_data, MACHINE_IP))
    conn.commit()
    conn.close()

def try_zklib():
    """Thu dung thu vien zklib"""
    try:
        import zklib
        from zklib.base import ZKLib
        
        log_info(f"Dang ket noi den {MACHINE_IP}:{MACHINE_PORT}...")
        
        zk = ZKLib(MACHINE_IP, MACHINE_PORT)
        ret = zk.connect()
        
        if not ret:
            log_error("Khong the ket noi den may cham cong")
            return False
        
        log_info("✓ Ket noi thanh cong!")
        
        # Lay thong tin may
        try:
            log_info("Dang lay thong tin may...")
            zk.getGeneralInfo()
        except:
            pass
        
        # Lay du lieu cham cong
        log_info("Dang doc du lieu cham cong...")
        try:
            attendances = zk.getAttendance()
            log_info(f"✓ Doc duoc {len(attendances)} ban ghi")
            
            for att in attendances:
                enroll_number = str(att.get('uid', ''))
                timestamp = str(att.get('timestamp', ''))
                
                if not enroll_number or not timestamp:
                    continue
                
                raw_data = json.dumps(att)
                
                log_info(f"Xu ly: {enroll_number} @ {timestamp}")
                
                # Luu local
                save_local(enroll_number, timestamp, raw_data)
                
                # Gui Supabase
                if push_to_supabase(enroll_number, timestamp, raw_data):
                    # Mark as synced
                    conn = sqlite3.connect(DB_FILE)
                    c = conn.cursor()
                    c.execute('''
                        UPDATE local_logs SET is_synced = 1, synced_at = datetime('now')
                        WHERE enroll_number = ? AND timestamp = ? AND machine_ip = ?
                    ''', (enroll_number, timestamp, MACHINE_IP))
                    conn.commit()
                    conn.close()
            
            log_info(f"✓ Hoan tat! Da xu ly {len(attendances)} ban ghi")
        except Exception as e:
            log_error(f"Loi khi doc attendance: {e}")
            return False
        finally:
            zk.disconnect()
            log_info("Da ngat ket noi")
        
        return True
        
    except ImportError:
        log_error("Chua cai dat thu vien zklib")
        log_info("Chay: pip install zklib")
        return False
    except Exception as e:
        log_error(f"Loi ket noi: {e}")
        return False

def main():
    log_info("========================================")
    log_info("ZK Pull Tool - Python (zklib)")
    log_info("========================================")
    log_info(f"May cham cong: {MACHINE_IP}:{MACHINE_PORT}")
    log_info(f"Supabase URL: {SUPABASE_URL}")
    log_info("========================================")
    
    init_db()
    
    # Thu ket noi
    if try_zklib():
        log_info("✓ Thanh cong!")
        sys.exit(0)
    else:
        log_error("✗ That bai!")
        sys.exit(1)

if __name__ == '__main__':
    main()
