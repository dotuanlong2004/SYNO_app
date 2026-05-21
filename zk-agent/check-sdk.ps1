# Check SDK COM Objects
Write-Host "========================================"
Write-Host "Kiem tra SDK Ronald Jack 2020"
Write-Host "========================================"

# Liet ke cac COM object lien quan
Write-Host ""
Write-Host "[1] Tim kiem COM object ZKTeco/Ronald Jack..."

$comObjects = @(
    "zkemkeeper.ZKEMKeeper",
    "zkemkeeper.ZKEMKeeper.1",
    "plcommpro.PLCOMM",
    "plcommpro.PLCOMM.1",
    "zkemsdk.ZKEMSDK",
    "PLCommPro.PLCOMM",
    "PLTCPComm.TCPComm",
    "PLRSCOMM.RSCOMM",
    "PLUSCOMM.USBCOMM"
)

foreach ($com in $comObjects) {
    try {
        $null = New-Object -ComObject $com -ErrorAction Stop
        Write-Host "  OK: $com"
    } catch {
        Write-Host "  FAIL: $com"
    }
}

Write-Host ""
Write-Host "[2] Liet ke registry keys..."
try {
    $keys = Get-ChildItem "HKLM:\SOFTWARE\Classes" | Where-Object { 
        $_.Name -match "zkem|plcomm|rscomm|tcpcomm" 
    }
    if ($keys) {
        $keys | ForEach-Object { 
            Write-Host "  Found: $($_.Name.Split('\')[-1])"
        }
    } else {
        Write-Host "  Khong tim thay registry keys"
    }
} catch {
    Write-Host "  Loi doc registry: $_"
}

Write-Host ""
Write-Host "========================================"
Write-Host "Hoan tat kiem tra"
Write-Host "========================================"
