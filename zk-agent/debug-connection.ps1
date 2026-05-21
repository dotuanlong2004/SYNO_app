# Debug ket noi den may cham cong ZKTeco
param([string]$ip = "192.168.0.100", [int]$port = 4370)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ZKTeco Connection Debug" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Ping test
Write-Host "`n[1] Ping test den $ip..." -ForegroundColor Yellow
$ping = Test-Connection -ComputerName $ip -Count 2 -ErrorAction SilentlyContinue
if ($ping) {
    Write-Host "    ✓ Ping OK - Average: $($ping | Select -ExpandProperty ResponseTime | Measure-Object -Average | Select -ExpandProperty Average)ms" -ForegroundColor Green
} else {
    Write-Host "    ✗ Ping FAILED" -ForegroundColor Red
}

# 2. TCP Port test
Write-Host "`n[2] TCP Port test $ip`:$port..." -ForegroundColor Yellow
try {
    $client = New-Object System.Net.Sockets.TcpClient
    $result = $client.BeginConnect($ip, $port, $null, $null)
    $success = $result.AsyncWaitHandle.WaitOne(5000, $false)
    if ($success -and $client.Connected) {
        Write-Host "    ✓ TCP Port $port OPEN - May cham cong dang lang nghe!" -ForegroundColor Green
        $client.Close()
    } else {
        Write-Host "    ✗ TCP Port $port CLOSED hoac TIMEOUT" -ForegroundColor Red
        Write-Host "    → May cham cong KHONG mo port $port" -ForegroundColor Red
    }
} catch {
    Write-Host "    ✗ Loi TCP: $_" -ForegroundColor Red
}

# 3. Test cac port khac cua ZKTeco
$ports = @(80, 443, 3380, 3381, 4370, 5005)
Write-Host "`n[3] Scan cac port ZKTeco thong dung..." -ForegroundColor Yellow
foreach ($p in $ports) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $result = $client.BeginConnect($ip, $p, $null, $null)
        $success = $result.AsyncWaitHandle.WaitOne(3000, $false)
        if ($success -and $client.Connected) {
            Write-Host "    ✓ Port $p: OPEN" -ForegroundColor Green
            $client.Close()
        } else {
            Write-Host "    ✗ Port $p: closed" -ForegroundColor Gray
        }
    } catch {
        Write-Host "    ✗ Port $p: error" -ForegroundColor Gray
    }
}

# 4. Check SDK
Write-Host "`n[4] Kiem tra ZKTeco SDK..." -ForegroundColor Yellow
$dllPaths = @(
    "C:\WINDOWS\sysWOW64\zkemkeeper.dll",
    "C:\WINDOWS\system32\zkemkeeper.dll",
    "C:\Program Files (x86)\ZKTime5.0\zkemkeeper.dll",
    "C:\Program Files\ZKTeco\ZKAccess\zkemkeeper.dll"
)
$found = $false
foreach ($dll in $dllPaths) {
    if (Test-Path $dll) {
        Write-Host "    ✓ Tim thay SDK: $dll" -ForegroundColor Green
        $found = $true
        # Check version
        try {
            $fileInfo = Get-ItemProperty $dll
            Write-Host "      Version: $($fileInfo.VersionInfo.FileVersion)" -ForegroundColor Gray
            Write-Host "      Modified: $($fileInfo.LastWriteTime)" -ForegroundColor Gray
        } catch {}
    }
}
if (-not $found) {
    Write-Host "    ✗ Khong tim thay zkemkeeper.dll" -ForegroundColor Red
}

# 5. Check registry
Write-Host "`n[5] Kiem tra Registry..." -ForegroundColor Yellow
try {
    $regPath = "HKLM:\SOFTWARE\Classes\CLSID\{00000000-0000-0000-0000-000000000000}"
    $zkclsid = Get-ChildItem "HKLM:\SOFTWARE\Classes\CLSID\" | Where-Object { $_.GetValue("(Default)") -like "*zkemkeeper*" } | Select-Object -First 1
    if ($zkclsid) {
        Write-Host "    ✓ Tim thay CLSID trong registry" -ForegroundColor Green
        Write-Host "      $($zkclsid.PSChildName)" -ForegroundColor Gray
    } else {
        Write-Host "    ✗ Khong tim thay CLSID zkemkeeper trong registry" -ForegroundColor Red
    }
} catch {
    Write-Host "    ✗ Khong doc duoc registry: $_" -ForegroundColor Red
}

# 6. Recommendations
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "KET LUAN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (-not $found) {
    Write-Host "→ CAN CAI DAT SDK ZKTeco" -ForegroundColor Red
    Write-Host "  Download: https://www.zkteco.com/Download/Software/161" -ForegroundColor Yellow
}

Write-Host "`nCac buoc tiep theo:" -ForegroundColor Yellow
Write-Host "1. Dam bao SDK da cai dat dung (chay ZKTime.exe de kiem tra)" -ForegroundColor White
Write-Host "2. Thu dung phan mem ZKTime de ket noi truoc" -ForegroundColor White
Write-Host "3. Kiem tra may cham cong co enable TCP/IP khong" -ForegroundColor White
Write-Host "4. Thu ket noi bang phan mem ZKTeco chinh hang" -ForegroundColor White
Write-Host "`nNeu port 4370 khong mo → SDK khong the ket noi TCP" -ForegroundColor Red
Write-Host "Can dung phan mem ZKTeco hoac ket noi USB/RS232" -ForegroundColor Red
