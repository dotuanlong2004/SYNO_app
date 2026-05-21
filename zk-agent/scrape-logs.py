#!/usr/bin/env python3
"""
Scrape attendance logs from Ronald Jack AI-X1 Web Interface
"""

import requests
import re
import json
import sqlite3
from datetime import datetime
from dotenv import load_dotenv
import os
from urllib.parse import urljoin

load_dotenv()

MACHINE_IP = "192.168.0.225"
BASE_URL = f"http://{MACHINE_IP}"
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '')
SUPABASE_TABLE = os.getenv('SUPABASE_TABLE', 'attendance_spam_logs')

def get_session():
    """Create session with proper headers"""
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0'
    })
    return session

def try_get_realtime_logs(session):
    """Try to get realtime logs page"""
    # Common endpoints for realtime logs
    endpoints = [
        "/realtime/logs",
        "/logs/realtime",
        "/realtime",
        "/live/logs",
        "/current/logs",
        "/ajax/realtime",
        "/api/realtime",
        "/data/realtime",
    ]
    
    for endpoint in endpoints:
        url = urljoin(BASE_URL, endpoint)
        try:
            response = session.get(url, timeout=10)
            if response.status_code == 200:
                content = response.text
                # Check if it contains log data
                if any(x in content.lower() for x in ['time', 'id', 'name', 'log', 'chấm công']):
                    print(f"Found data at: {endpoint}")
                    return content
        except:
            pass
    
    return None

def parse_logs_from_html(html):
    """Parse attendance logs from HTML table"""
    logs = []
    
    # Try to find table data
    # Pattern for table rows
    row_pattern = r'<tr[^>]*>(.*?)</tr>'
    rows = re.findall(row_pattern, html, re.DOTALL)
    
    for row in rows:
        # Try to extract data from row
        # Look for time pattern: YYYY-MM-DD HH:MM:SS
        time_match = re.search(r'(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2})', row)
        
        # Look for ID (usually a number)
        id_match = re.search(r'>(\d{1,10})<', row)
        
        # Look for name
        name_match = re.search(r'>([^<]{2,50})<', row)
        
        if time_match:
            log = {
                'timestamp': time_match.group(1),
                'id': id_match.group(1) if id_match else 'unknown',
                'name': name_match.group(1) if name_match else 'unknown',
                'raw': row[:200]
            }
            logs.append(log)
    
    return logs

def try_ajax_api(session):
    """Try to find AJAX API calls"""
    # Get main page and look for JavaScript API calls
    try:
        response = session.get(BASE_URL, timeout=10)
        html = response.text
        
        # Look for API endpoints in JavaScript
        api_patterns = [
            r'["\']([\/\w\-]+\/(?:ajax|api|query|data|get|fetch)[\/\w\-]*)["\']',
            r'url\s*[=:]\s*["\']([^"\']+(?:ajax|api|query|data)[^"\']*)["\']',
            r'\.get\(["\']([^"\']+)["\']',
            r'\$\.ajax\s*\(\s*\{[^}]*url\s*:\s*["\']([^"\']+)["\']',
        ]
        
        found_endpoints = set()
        for pattern in api_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            found_endpoints.update(matches)
        
        print(f"Found {len(found_endpoints)} potential AJAX endpoints")
        
        for endpoint in found_endpoints:
            if not endpoint.startswith('/'):
                endpoint = '/' + endpoint
            url = urljoin(BASE_URL, endpoint)
            try:
                response = session.get(url, timeout=5)
                if response.status_code == 200:
                    print(f"  {endpoint}: OK")
                    # Try to parse as JSON
                    try:
                        data = response.json()
                        print(f"    -> JSON data: {str(data)[:200]}")
                        return data
                    except:
                        if len(response.text) > 100:
                            print(f"    -> Text: {response.text[:200]}")
            except:
                pass
        
        return None
    except Exception as e:
        print(f"Error in AJAX API: {e}")
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
    print("Scraping Logs from Ronald Jack AI-X1")
    print("=" * 50)
    
    session = get_session()
    
    # Try AJAX API first
    print("\n[1] Trying AJAX API...")
    ajax_data = try_ajax_api(session)
    
    if ajax_data:
        print(f"Found data via AJAX: {ajax_data}")
        # Process and push to Supabase
        return
    
    # Try realtime logs page
    print("\n[2] Trying realtime logs page...")
    html = try_get_realtime_logs(session)
    
    if html:
        logs = parse_logs_from_html(html)
        print(f"Found {len(logs)} logs")
        for log in logs:
            print(f"  - {log['timestamp']}: {log['name']} (ID: {log['id']})")
            push_to_supabase(log['id'], log['timestamp'], log)
    else:
        print("No logs found via scraping")
    
    print("\n" + "=" * 50)
    print("Alternative: Use browser's F12 Network tab to capture API calls")
    print("=" * 50)

if __name__ == '__main__':
    main()
