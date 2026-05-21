#!/usr/bin/env python3
"""
Discover API endpoints by trying common patterns
"""

import requests
import re

MACHINE_IP = "192.168.0.225"
BASE_URL = f"http://{MACHINE_IP}"

def discover_from_html():
    """Try to find API endpoints from HTML source"""
    try:
        response = requests.get(BASE_URL, timeout=10)
        html = response.text
        
        # Look for API endpoints in HTML
        patterns = [
            r'["\']([\/\w\-\?\=\&]+)["\']',
            r'url["\']?\s*:\s*["\']([^"\']+)["\']',
            r'api["\']?\s*:\s*["\']([^"\']+)["\']',
            r'fetch\(["\']([^"\']+)["\']',
            r'axios\.[get|post|put|delete]+\(["\']([^"\']+)["\']',
        ]
        
        found = set()
        for pattern in patterns:
            matches = re.findall(pattern, html)
            for match in matches:
                if '/' in match and len(match) > 3:
                    found.add(match)
        
        print("Potential endpoints found in HTML:")
        for endpoint in sorted(found):
            if endpoint.startswith('/'):
                print(f"  {endpoint}")
        
        return found
    except Exception as e:
        print(f"Error fetching HTML: {e}")
        return set()

def try_common_ronald_jack():
    """Try Ronald Jack specific endpoints"""
    endpoints = [
        "/aiface/api/logs",
        "/aiface/api/attendance",
        "/api/aiface/logs",
        "/api/device/logs",
        "/api/v1/logs",
        "/api/v2/attendance",
        "/api/getLogs",
        "/api/getAttendance",
        "/action/GetLogs",
        "/action/GetAttendance",
        "/query?type=attendance",
        "/query/logs",
        "/data/logs",
        "/data/attendance",
    ]
    
    print("\nTrying Ronald Jack specific endpoints...")
    for endpoint in endpoints:
        url = f"{BASE_URL}{endpoint}"
        try:
            response = requests.get(url, timeout=5)
            if response.status_code != 404:
                print(f"  {endpoint}: {response.status_code}")
                if response.status_code == 200:
                    print(f"    -> {response.text[:200]}")
        except:
            pass

def try_post_endpoints():
    """Try POST endpoints"""
    endpoints = [
        "/api/logs",
        "/api/attendance",
        "/api/query",
    ]
    
    print("\nTrying POST endpoints...")
    for endpoint in endpoints:
        url = f"{BASE_URL}{endpoint}"
        try:
            response = requests.post(url, data={"type": "attendance"}, timeout=5)
            if response.status_code != 404:
                print(f"  POST {endpoint}: {response.status_code}")
        except:
            pass

def main():
    print("=" * 50)
    print("API Discovery for Ronald Jack AI-X1")
    print("=" * 50)
    
    discover_from_html()
    try_common_ronald_jack()
    try_post_endpoints()
    
    print("\n" + "=" * 50)
    print("Tip: Open browser F12 → Network tab to see actual API calls")
    print("=" * 50)

if __name__ == '__main__':
    main()
