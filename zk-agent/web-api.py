#!/usr/bin/env python3
"""
Get attendance data from Ronald Jack AI-X1 Web API
"""

import requests
import json
import sqlite3
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

MACHINE_IP = "192.168.0.225"
BASE_URL = f"http://{MACHINE_IP}"
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '')
SUPABASE_TABLE = os.getenv('SUPABASE_TABLE', 'attendance_spam_logs')

def test_api_endpoints():
    """Test common attendance API endpoints"""
    endpoints = [
        "/iclock/cdata?table=ATTLOG",
        "/iclock/cdata?table=OPERLOG",
        "/api/attendance/logs",
        "/api/realtime/logs",
        "/cgi-bin/attendance",
        "/api/logs",
        "/device/api/logs",
        "/ajax/attendance",
    ]
    
    print("Testing API endpoints...")
    for endpoint in endpoints:
        url = f"{BASE_URL}{endpoint}"
        try:
            response = requests.get(url, timeout=5)
            print(f"  {endpoint}: {response.status_code}")
            if response.status_code == 200:
                print(f"    -> Content: {response.text[:200]}")
                return endpoint, response.text
        except Exception as e:
            print(f"  {endpoint}: ERROR - {e}")
    
    return None, None

def get_device_info():
    """Get device info to understand API structure"""
    try:
        # Try common device info endpoints
        endpoints = [
            "/iclock/getdeviceinfo",
            "/api/device/info",
            "/device/info",
            "/api/info",
        ]
        
        for endpoint in endpoints:
            url = f"{BASE_URL}{endpoint}"
            try:
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    print(f"Device info from {endpoint}:")
                    print(response.text[:500])
                    return response.json() if response.headers.get('content-type', '').startswith('application/json') else None
            except:
                pass
    except Exception as e:
        print(f"Error getting device info: {e}")
    return None

def push_to_supabase(student_code, timestamp, raw_data):
    """Push data to Supabase"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Missing Supabase config")
        return False
    
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}"
    headers = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Prefer': 'return=minimal'
    }
    
    payload = {
        'student_code': str(student_code),
        'created_at': timestamp,
        'source': 'ronald-jack-web',
        'machine_ip': MACHINE_IP,
        'raw_data': json.dumps(raw_data) if isinstance(raw_data, dict) else str(raw_data)
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code in [200, 201]:
            print(f"  ✓ Pushed to Supabase: {student_code}")
            return True
        else:
            print(f"  ✗ Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

def main():
    print("=" * 50)
    print("Ronald Jack AI-X1 Web API Tool")
    print("=" * 50)
    
    # Test endpoints
    endpoint, data = test_api_endpoints()
    
    if endpoint:
        print(f"\nFound working endpoint: {endpoint}")
        print(f"Data preview: {data[:500]}")
        
        # Try to parse and push to Supabase
        # This part depends on the actual API response format
    else:
        print("\nNo working API endpoint found.")
        print("\nTrying alternative methods...")
        
        # Check if there's a download/export feature
        export_endpoints = [
            "/api/export/attendance",
            "/download/attendance",
            "/export/logs",
        ]
        
        for endpoint in export_endpoints:
            url = f"{BASE_URL}{endpoint}"
            try:
                response = requests.get(url, timeout=5)
                print(f"  {endpoint}: {response.status_code}")
            except:
                pass

if __name__ == '__main__':
    main()
