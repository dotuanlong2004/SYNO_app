#!/usr/bin/env python3
"""
Find API endpoints in JavaScript files
"""

import requests
import re
from urllib.parse import urljoin

MACHINE_IP = "192.168.0.225"
BASE_URL = f"http://{MACHINE_IP}"

def get_all_js_files(session):
    """Get all JavaScript files from the page"""
    try:
        response = session.get(BASE_URL, timeout=10)
        html = response.text
        
        # Find all JS files
        js_pattern = r'<script[^>]*src=["\']([^"\']+)["\']'
        js_files = re.findall(js_pattern, html)
        
        print(f"Found {len(js_files)} JS files:")
        for js in js_files[:10]:  # Limit to first 10
            print(f"  {js}")
        
        return js_files
    except Exception as e:
        print(f"Error getting JS files: {e}")
        return []

def analyze_js_file(session, js_url):
    """Analyze a JS file for API endpoints"""
    try:
        if not js_url.startswith('http'):
            js_url = urljoin(BASE_URL, js_url)
        
        response = session.get(js_url, timeout=10)
        js_content = response.text
        
        # Look for API calls
        patterns = [
            r'["\']([\/\w\-]+\/(?:api|ajax|query|get|fetch|load)[\/\w\-]*)["\']',
            r'url\s*[=:]\s*["\']([^"\']+(?:api|ajax|query)[^"\']*)["\']',
            r'\.get\(["\']([^"\']+)["\']',
            r'axios\.\w+\(["\']([^"\']+)["\']',
            r'fetch\(["\']([^"\']+)["\']',
            r'\$\.ajax\s*\(\s*\{[^}]*url\s*:\s*["\']([^"\']+)["\']',
        ]
        
        found = set()
        for pattern in patterns:
            matches = re.findall(pattern, js_content)
            found.update(matches)
        
        return found
    except Exception as e:
        return set()

def main():
    print("=" * 50)
    print("Finding API in JavaScript files")
    print("=" * 50)
    
    session = requests.Session()
    session.headers.update({'User-Agent': 'Mozilla/5.0'})
    
    # Get JS files
    js_files = get_all_js_files(session)
    
    all_endpoints = set()
    
    # Analyze each JS file
    for js_file in js_files[:5]:  # Check first 5 files
        print(f"\nAnalyzing: {js_file}")
        endpoints = analyze_js_file(session, js_file)
        if endpoints:
            print(f"  Found {len(endpoints)} endpoints:")
            for ep in endpoints:
                print(f"    {ep}")
                all_endpoints.add(ep)
    
    # Test found endpoints
    if all_endpoints:
        print(f"\nTesting {len(all_endpoints)} unique endpoints...")
        for endpoint in all_endpoints:
            if not endpoint.startswith('/'):
                endpoint = '/' + endpoint
            url = urljoin(BASE_URL, endpoint)
            try:
                response = session.get(url, timeout=5)
                if response.status_code == 200:
                    print(f"  ✓ {endpoint}: {response.status_code}")
                    print(f"    -> {response.text[:150]}")
            except:
                pass
    else:
        print("\nNo API endpoints found in JS files")
    
    print("\n" + "=" * 50)
    print("Last resort: Check if there's a 'Download' or 'Export' button")
    print("in the 'Nhật ký thời gian thực' tab")
    print("=" * 50)

if __name__ == '__main__':
    main()
