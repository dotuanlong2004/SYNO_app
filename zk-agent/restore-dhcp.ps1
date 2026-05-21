# Script khoi phuc IP ve DHCP (lay IP tu dong)
# Yeu cau: Chay PowerShell voi quyen Administrator

# Kiem tra quyen Admin
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "[LOI] Can chay PowerShell voi quyen Administrator!" -ForegroundColor Red
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Khoi phuc IP ve DHCP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Tim adapter
$adapter = Get-NetAdapter | Where-Object { 
    $_.Status -eq 'Up' -and ($_.Name -like '*Wi-Fi*' -or $_.Name -like '*Ethernet*' -or $_.Name -like '*Wireless*') 
} | Select-Object -First 1

if (-not $adapter) {
    Write-Host "[LOI] Khong tim thay adapter!" -ForegroundColor Red
    exit 1
}

Write-Host "Adapter: $($adapter.Name)" -ForegroundColor Yellow
Write-Host ""

try {
    # Xoa IP tinh
    Write-Host "-> Dang xoa IP tinh..." -ForegroundColor Yellow
    Get-NetIPAddress -InterfaceIndex $adapter.ifIndex -AddressFamily IPv4 | 
        Where-Object { $_.PrefixOrigin -ne 'WellKnown' } | 
        ForEach-Object { 
            Remove-NetIPAddress -InterfaceIndex $adapter.ifIndex -IPAddress $_.IPAddress -Confirm:$false -ErrorAction SilentlyContinue 
        }
    
    # Xoa gateway
    Write-Host "-> Dang xoa gateway..." -ForegroundColor Yellow
    Remove-NetRoute -InterfaceIndex $adapter.ifIndex -Confirm:$false -ErrorAction SilentlyContinue
    
    # Bat DHCP
    Write-Host "-> Bat che do DHCP..." -ForegroundColor Green
    Set-NetIPInterface -InterfaceIndex $adapter.ifIndex -Dhcp Enabled | Out-Null
    
    # Renew IP
    Write-Host "-> Dang xin IP moi tu router..." -ForegroundColor Green
    ipconfig /renew | Out-Null
    
    # Hien thi IP moi
    Start-Sleep -Seconds 2
    $newIP = Get-NetIPAddress -InterfaceIndex $adapter.ifIndex -AddressFamily IPv4 | 
        Where-Object { $_.PrefixOrigin -ne 'WellKnown' } | 
        Select-Object -ExpandProperty IPAddress -First 1
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "   ✓ KHOI PHUC THANH CONG!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "IP moi (DHCP): $newIP" -ForegroundColor Green
    
} catch {
    Write-Host "[LOI] $_" -ForegroundColor Red
}
