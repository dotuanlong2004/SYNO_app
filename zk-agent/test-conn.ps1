$zk = New-Object -ComObject 'zkemkeeper.ZKEM'
$ip = "192.168.0.225"
$port = 4370

Write-Host "Testing connection methods..."

# Test Connect_Net
Write-Host "1. Testing Connect_Net..."
try {
    $r = $zk.Connect_Net($ip, $port)
    Write-Host "   Result: $r"
} catch {
    Write-Host "   Error: $_"
}

# Test NetConnect
Write-Host "2. Testing NetConnect..."
try {
    $r = $zk.NetConnect($ip, $port, 1)
    Write-Host "   Result: $r"
} catch {
    Write-Host "   Error: $_"
}

# Test ConnectByIp
Write-Host "3. Testing ConnectByIp..."
try {
    $r = $zk.ConnectByIp($ip, $port)
    Write-Host "   Result: $r"
} catch {
    Write-Host "   Error: $_"
}

Write-Host "Done"
