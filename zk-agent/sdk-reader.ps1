# PowerShell script đọc dữ liệu chấm công từ ZKTeco device sử dụng SDK
# SDK đã được đăng ký: zkemkeeper.dll

$ErrorActionPreference = "Stop"

# Config
$MachineIP = "192.168.0.225"
$MachinePort = 4370
$BackendUrl = "http://localhost:3000/api/v1/hardware/scan"
$DbFile = "./agent-buffer.sqlite"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   ZK SDK Reader - Đọc dữ liệu chấm công" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Device IP: $MachineIP" -ForegroundColor Yellow
Write-Host "Device Port: $MachinePort" -ForegroundColor Yellow
Write-Host "Backend: $BackendUrl" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

# Tạo COM object từ SDK đã đăng ký
try {
    Write-Host "[1] Đang tạo kết nối COM đến SDK..." -ForegroundColor Yellow
    $zk = New-Object -ComObject "zkemkeeper.ZKEMKeeper"
    Write-Host "    ✓ SDK loaded" -ForegroundColor Green
} catch {
    Write-Host "    ✗ Không thể load SDK: $_" -ForegroundColor Red
    Write-Host "    Kiểm tra: regsvr32 C:\WINDOWS\sysWOW64\zkemkeeper.dll" -ForegroundColor Yellow
    exit 1
}

# Kết nối đến máy chấm công
try {
    Write-Host "[2] Đang kết nối đến máy chấm công $MachineIP`:$MachinePort..." -ForegroundColor Yellow
    
    # Connect_Net trả về bool
    $connected = $zk.Connect_Net($MachineIP, $MachinePort)
    
    if (-not $connected) {
        Write-Host "    ✗ Không thể kết nối" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "    ✓ Kết nối thành công!" -ForegroundColor Green
    
} catch {
    Write-Host "    ✗ Lỗi kết nối: $_" -ForegroundColor Red
    exit 1
}

# Main processing
try {

# Đọc thông tin thiết bị
try {
    Write-Host "[3] Đang đọc thông tin thiết bị..." -ForegroundColor Yellow
    
    $serialNumber = ""
    $zk.GetSerialNumber($MachinePort, [ref]$serialNumber)
    Write-Host "    Serial: $serialNumber" -ForegroundColor Green
    
} catch {
    Write-Host "    ⚠ Không đọc được serial: $_" -ForegroundColor Yellow
}

# Đọc dữ liệu chấm công
try {
    Write-Host "[4] Đang đọc dữ liệu chấm công..." -ForegroundColor Yellow
    
    # Bật chế độ đọc log
    $zk.ReadGeneralLogData($MachinePort)
    
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
    
    # Lặp đọc từng log
    while ($zk.SSR_GetGeneralLogData(
        $MachinePort, 
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
        
        $log = [PSCustomObject]@{
            EnrollNumber = $enrollNumber.Trim()
            Timestamp = $timestamp
            VerifyMode = $verifyMode
            InOutMode = $inOutMode
            WorkCode = $workCode
        }
        
        $logs += $log
        Write-Host "    Found: $($log.EnrollNumber) @ $($log.Timestamp)" -ForegroundColor Gray
    }
    
    Write-Host "    ✓ Đọc được $($logs.Count) bản ghi" -ForegroundColor Green
    
    # Ngắt kết nối
    $zk.Disconnect()
    Write-Host "[5] Đã ngắt kết nối" -ForegroundColor Yellow
    
    # Gửi dữ liệu lên backend
    if ($logs.Count -gt 0) {
        Write-Host "[6] Đang gửi dữ liệu lên backend..." -ForegroundColor Yellow
        
        $successCount = 0
        $errorCount = 0
        
        foreach ($log in $logs) {
            try {
                $payload = @{
                    student_id = $log.EnrollNumber
                    scanned_at = $log.Timestamp
                    source = "zk-sdk-ps1"
                    machine_ip = $MachineIP
                    raw = ($log | ConvertTo-Json -Compress)
                } | ConvertTo-Json
                
                $response = Invoke-RestMethod -Uri $BackendUrl -Method POST -ContentType "application/json" -Body $payload -TimeoutSec 10
                $successCount++
                Write-Host "    ✓ Sent: $($log.EnrollNumber)" -ForegroundColor Green
                
            } catch {
                $errorCount++
                Write-Host "    ✗ Failed: $($log.EnrollNumber) - $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host "Kết quả: $successCount thành công, $errorCount lỗi" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Cyan
    } else {
        Write-Host "    Không có dữ liệu để gửi" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "    ✗ Lỗi đọc dữ liệu: $_" -ForegroundColor Red
}

# Ngắt kết nối
try {
    $zk.Disconnect()
    Write-Host "[7] Đã ngắt kết nối" -ForegroundColor Yellow
} catch {
    # Ignore
}

} catch {
    Write-Host "    ✗ Lỗi xử lý: $_" -ForegroundColor Red
}

Write-Host "Done!" -ForegroundColor Green
