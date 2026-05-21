# Set static IP
Write-Host 'Setting IP to 192.168.1.10...' -ForegroundColor Cyan
$adapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1
if (-not $adapter) { Write-Host 'No adapter found' -ForegroundColor Red; exit 1 }
Write-Host 'Adapter: '
Remove-NetIPAddress -InterfaceIndex $adapter.ifIndex -Confirm:$false -ErrorAction SilentlyContinue
New-NetIPAddress -InterfaceIndex $adapter.ifIndex -IPAddress '192.168.1.10' -PrefixLength 24 -DefaultGateway '192.168.1.1' | Out-Null
Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ServerAddresses @('8.8.8.8') | Out-Null
Write-Host 'Done! IP set to 192.168.1.10' -ForegroundColor Green
