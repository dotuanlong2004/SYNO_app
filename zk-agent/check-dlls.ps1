# Check SDK DLLs
Write-Host "Checking COM objects..."

$comList = @(
    "pltcpcomm.TCPComm",
    "plcommpro.PLCOMM",
    "zkemkeeper.ZKEM"
)

foreach ($com in $comList) {
    try {
        $null = New-Object -ComObject $com -ErrorAction Stop
        Write-Host "OK: $com"
    } catch {
        Write-Host "FAIL: $com"
    }
}
