# ZKTeco SDK Reader - Dung zkemkeeper.dll de doc du lieu qua TCP
param(
    [string]$ip = "192.168.0.225",
    [int]$port = 4370,
    [string]$outputFile = "zk-data.json"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ZK SDK Reader - Doc du lieu may cham cong" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IP: $ip" -ForegroundColor Yellow
Write-Host "Port: $port" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

try {
    # Tao COM object tu SDK da dang ky
    Write-Host "[1] Dang load SDK (zkemkeeper.ZKEM)..." -ForegroundColor Yellow
    $zk = New-Object -ComObject "zkemkeeper.ZKEM"
    Write-Host "    ✓ SDK loaded" -ForegroundColor Green
} catch {
    Write-Host "    ✗ Khong the load SDK: $_" -ForegroundColor Red
    Write-Host "    Thu dang ky lai SDK..." -ForegroundColor Yellow
    
    # Thu dang ky lai DLL
    try {
        $dllPath = "C:\WINDOWS\sysWOW64\zkemkeeper.dll"
        if (Test-Path $dllPath) {
            Write-Host "    Dang chay: regsvr32 $dllPath" -ForegroundColor Yellow
            $regResult = Start-Process -FilePath "regsvr32.exe" -ArgumentList "/s `"$dllPath`"" -Wait -PassThru
            if ($regResult.ExitCode -eq 0) {
                Write-Host "    ✓ Dang ky DLL thanh cong, thu lai..." -ForegroundColor Green
                $zk = New-Object -ComObject "zkemkeeper.ZKEM"
                Write-Host "    ✓ SDK loaded sau khi dang ky lai" -ForegroundColor Green
            } else {
                throw "regsvr32 failed with exit code $($regResult.ExitCode)"
            }
        } else {
            throw "Khong tim thay DLL tai $dllPath"
        }
    } catch {
        Write-Host "    ✗ Khong the dang ky lai: $_" -ForegroundColor Red
        Write-Host "    Hay chay CMD as Administrator va chay: regsvr32 C:\WINDOWS\sysWOW64\zkemkeeper.dll" -ForegroundColor Yellow
        exit 1
    }
}

try {
    # Ket noi den may cham cong
    Write-Host "[2] Dang ket noi den $ip`:$port..." -ForegroundColor Yellow
    $connected = $zk.Connect_Net($ip, $port)
    
    if (-not $connected) {
        Write-Host "    ✗ Khong the ket noi (Connect_Net tra ve false)" -ForegroundColor Red
        exit 1
    }
    Write-Host "    ✓ Ket noi thanh cong!" -ForegroundColor Green

    # Doc thong tin thiet bi
    try {
        Write-Host "[3] Dang doc thong tin thiet bi..." -ForegroundColor Yellow
        $serial = ""
        [void]$zk.GetSerialNumber($port, [ref]$serial)
        Write-Host "    Serial: $serial" -ForegroundColor Green
    } catch {
        Write-Host "    ⚠ Khong doc duoc serial" -ForegroundColor Yellow
    }

    # Doc du lieu cham cong
    Write-Host "[4] Dang doc du lieu cham cong..." -ForegroundColor Yellow
    [void]$zk.ReadGeneralLogData($port)
    
    $logs = @()
    $enrollNumber = ""
    $verifyMode = 0
    $inOutMode = 0
    $year = 0
    $month = 0
    $day = 0
    $hour = 0
    $minute = 0
    $second = 0
    $workCode = 0
    
    while ($zk.SSR_GetGeneralLogData(
        $port,
        [ref]$enrollNumber,
        [ref]$verifyMode,
        [ref]$inOutMode,
        [ref]$year,
        [ref]$month,
        [ref]$day,
        [ref]$hour,
        [ref]$minute,
        [ref]$second,
        [ref]$workCode
    )) {
        $timestamp = "{0:D4}-{1:D2}-{2:D2} {3:D2}:{4:D2}:{5:D2}" -f $year, $month, $day, $hour, $minute, $second
        
        $log = @{
            enrollNumber = $enrollNumber.Trim()
            timestamp = $timestamp
            verifyMode = $verifyMode
            inOutMode = $inOutMode
        }
        $logs += $log
        Write-Host "    + $($log.enrollNumber) @ $($log.timestamp)" -ForegroundColor Gray
    }
    
    Write-Host "    ✓ Doc duoc $($logs.Count) ban ghi" -ForegroundColor Green
    
    # Luu ra file JSON
    $output = @{
        success = $true
        count = $logs.Count
        logs = $logs
        timestamp = (Get-Date).ToString("o")
    } | ConvertTo-Json -Depth 10
    
    $output | Out-File -FilePath $outputFile -Encoding UTF8
    Write-Host "[5] ✓ Da luu du lieu vao: $outputFile" -ForegroundColor Green
    
    # Ngat ket noi
    [void]$zk.Disconnect()
    Write-Host "[6] Da ngat ket noi" -ForegroundColor Yellow
    
    exit 0
    
} catch {
    Write-Host "    ✗ Loi: $_" -ForegroundColor Red
    Write-Host "    Stack: $($_.ScriptStackTrace)" -ForegroundColor Red
    
    # Thu ngat ket noi
    try { [void]$zk.Disconnect() } catch {}
    
    # Luu loi ra file
    $errorResult = @{
        success = $false
        error = $_.ToString()
        timestamp = (Get-Date).ToString("o")
    } | ConvertTo-Json
    $errorResult | Out-File -FilePath $outputFile -Encoding UTF8
    
    exit 1
}
