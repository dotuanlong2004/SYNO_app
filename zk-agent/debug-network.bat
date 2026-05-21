@echo off
setlocal

echo ==========================================
echo   Network Debug Tool
echo ==========================================
echo.
echo IP may cham cong: 192.168.1.225
echo Port: 4370
echo.

echo [1] Ping den may cham cong...
ping -n 3 192.168.1.225
echo.

echo [2] Kiem tra port 4370...
echo Dang thu ket noi TCP den 192.168.1.225:4370...
powershell -Command "$socket = New-Object Net.Sockets.TcpClient; try { $socket.Connect('192.168.1.225', 4370); Write-Host '  ✓ Port 4370 MO - ket noi duoc!' -ForegroundColor Green; $socket.Close() } catch { Write-Host '  ✗ Port 4370 DONG hoac khong phan hoi' -ForegroundColor Red }"
echo.

echo [3] Kiem tra port 5055 (port thay the cua ZKTeco)...
powershell -Command "$socket = New-Object Net.Sockets.TcpClient; try { $socket.Connect('192.168.1.225', 5055); Write-Host '  ✓ Port 5055 MO - ket noi duoc!' -ForegroundColor Green; $socket.Close() } catch { Write-Host '  ✗ Port 5055 DONG' -ForegroundColor Yellow }"
echo.

echo [4] Thong tin mang cua may tinh nay...
ipconfig | findstr /i "ipv4 subnet gateway"
echo.

echo ==========================================
echo Ket thuc debug.
echo.
echo Neu ping khong duoc:
echo - May cham cong chua ket noi WiFi
echo - May tinh va may cham cong khac mang
echo.
echo Neu ping duoc nhung port dong:
echo - May cham cong chua bat che do TCP/Network
echo - Sai port (thu port 5055)
echo - Firewall chan
echo.
pause
