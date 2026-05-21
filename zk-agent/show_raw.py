import os
import urllib.request, json

password = os.getenv('MACHINE_PASSWORD')
if not password:
    raise SystemExit('Missing MACHINE_PASSWORD environment variable')

r = urllib.request.Request(
    'http://192.168.0.225/api',
    json.dumps({'cmd': 'getlog', 'password': password}).encode(),
    {'Content-Type': 'application/json'}
)
data = json.loads(urllib.request.urlopen(r, timeout=5).read())

print(f"=== RAW TU MAY CHAM CONG === total={data['count']}")
for i, rec in enumerate(data['record']):
    print(f"  [{i+1}] enrollid={rec['enrollid']}  name={rec['name']}  time={rec['time']}  inout={rec['inout']}")
