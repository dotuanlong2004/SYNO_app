# Pull data from ZKTeco device and save to JSON
param(
    [string]$ip = "192.168.0.225",
    [int]$port = 4370,
    [string]$outputFile = "attendance-data.json"
)

try {
    # Load SDK
    $zk = New-Object -ComObject "zkemkeeper.ZKEM"
    
    # Try different connection methods
    Write-Host "Trying Connect_Net..."
    $result = $zk.Connect_Net($ip, $port)
    
    if (-not $result) {
        Write-Host "Connect_Net failed, trying Connect_TCP..."
        # Try alternative methods
        try {
            $result = $zk.Connect_TCP($ip, $port, 1)
        } catch {
            Write-Host "Connect_TCP not available"
        }
        
        if (-not $result) {
            Write-Error "Cannot connect to $ip`:$port"
            exit 1
        }
    }
    
    # Enable device
    $zk.EnableDevice(1, $false)
    
    # Read attendance logs
    $logs = @()
    $dwMachineNumber = 1
    $dwTMachineNumber = 0
    $dwEnrollNumber = 0
    $dwEMachineNumber = 0
    $dwVerifyMode = 0
    $dwInOutMode = 0
    $dwYear = 0
    $dwMonth = 0
    $dwDay = 0
    $dwHour = 0
    $dwMinute = 0
    $dwSecond = 0
    $dwWorkCode = 0
    
    $zk.ReadGeneralLogData($dwMachineNumber)
    
    while ($zk.GetGeneralLogData($dwMachineNumber, [ref]$dwTMachineNumber, [ref]$dwEnrollNumber, [ref]$dwEMachineNumber, 
                                   [ref]$dwVerifyMode, [ref]$dwInOutMode, [ref]$dwYear, [ref]$dwMonth, [ref]$dwDay, 
                                   [ref]$dwHour, [ref]$dwMinute, [ref]$dwSecond, [ref]$dwWorkCode)) {
        $timestamp = "{0:D4}-{1:D2}-{2:D2} {3:D2}:{4:D2}:{5:D2}" -f $dwYear, $dwMonth, $dwDay, $dwHour, $dwMinute, $dwSecond
        $logs += @{
            enroll_number = $dwEnrollNumber
            timestamp = $timestamp
            verify_mode = $dwVerifyMode
            in_out_mode = $dwInOutMode
        }
    }
    
    # Enable device
    $zk.EnableDevice(1, $true)
    $zk.Disconnect()
    
    # Save to JSON
    $output = @{
        success = $true
        count = $logs.Count
        logs = $logs
        machine_ip = $ip
        timestamp = (Get-Date).ToString("o")
    } | ConvertTo-Json -Depth 10
    
    $output | Out-File -FilePath $outputFile -Encoding UTF8
    Write-Host "Success: $($logs.Count) records saved to $outputFile"
    
} catch {
    $errorResult = @{
        success = $false
        error = $_.ToString()
        timestamp = (Get-Date).ToString("o")
    } | ConvertTo-Json
    $errorResult | Out-File -FilePath $outputFile -Encoding UTF8
    Write-Error "Failed: $_"
    exit 1
}
