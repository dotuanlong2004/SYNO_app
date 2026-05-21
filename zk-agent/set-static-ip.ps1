# Script đổi IP máy tính sang subnet 192.168.1.x để kết nối máy chấm công
# Yêu cầu: Chạy PowerShell với quyền Administrator

# Kiểm tra quyền Admin
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "[LOI] Can chay PowerShell voi quyen Administrator!" -ForegroundColor Red
    Write-Host "Cach: Nhan chuot phai vao PowerShell -> Run as Administrator"
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Dat IP tinh cho may tinh" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Tim interface WiFi hoac Ethernet dang hoat dong
$adapter = Get-NetAdapter | Where-Object { 
    $_.Status -eq 'Up' -and ($_.Name -like '*Wi-Fi*' -or $_.Name -like '*Ethernet*' -or $_.Name -like '*Wireless*') 
} | Select-Object -First 1

if (-not $adapter) {
    Write-Host "[LOI] Khong tim thay adapter mang dang hoat dong!" -ForegroundColor Red
    Get-NetAdapter | Format-Table Name, Status, InterfaceDescription
    exit 1
}

Write-Host "Adapter tim thay: $($adapter.Name)" -ForegroundColor Green
Write-Host ""

# Lấy thông tin IP hiện tại
$currentIP = Get-NetIPAddress -InterfaceIndex $adapter.ifIndex -AddressFamily IPv4 | Where-Object { $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1
Write-Host "IP hien tai: $($currentIP.IPAddress)" -ForegroundColor Yellow
Write-Host ""

# IP tĩnh mới
$newIP = "192.168.1.10"
$subnet = "255.255.255.0"
$gateway = "192.168.1.1"

try {
    Write-Host "Dang dat IP tinh..." -ForegroundColor Cyan
    
    # Xoa IP cu (neu co)
    if ($currentIP) {
        Write-Host "  -> Xoa IP cu: $($currentIP.IPAddress)" -ForegroundColor Yellow
        Remove-NetIPAddress -InterfaceIndex $adapter.ifIndex -IPAddress $currentIP.IPAddress -Confirm:$false -ErrorAction SilentlyContinue
    }
    
    # Dat IP moi
    Write-Host "  -> Dat IP moi: $newIP" -ForegroundColor Green
    New-NetIPAddress -InterfaceIndex $adapter.ifIndex -IPAddress $newIP -PrefixLength 24 -DefaultGateway $gateway | Out-Null
    
    # Dat DNS
    Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ServerAddresses @("8.8.8.8", "8.8.4.4") | Out-Null
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "   ✓ DAT IP THANH CONG!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "IP moi: $newIP" -ForegroundColor Green
    Write-Host "Subnet: $subnet" -ForegroundColor Green
    Write-Host "Gateway: $gateway" -ForegroundColor Green
    Write-Host ""
    Write-Host "BAY GIO CO THE KET NOI TOI MAY CHAM CONG!" -ForegroundColor Cyan
    Write-Host "  - IP May cham cong: 192.168.1.225" -ForegroundColor Cyan
    Write-Host "  - Port: 5005" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "De khoi phuc IP cu, chay: .\restore-dhcp.ps1" -ForegroundColor Yellow
    
} catch {
    Write-Host "[LOI] Khong the dat IP: $_" -ForegroundColor Red
    exit 1
}
