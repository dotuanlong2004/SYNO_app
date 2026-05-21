@echo off
chcp 65001 >nul
echo ==========================================
echo   DOI IP MAY TINH - KET NOI MAY CHAM CONG
echo ==========================================
echo.
echo IP hien tai cua may tinh:
ipconfig | findstr /i "ipv4"
echo.
echo IP may cham cong: 192.168.1.225
echo Can doi IP may tinh sang 192.168.1.x
echo.
echo [LUA CHON]
echo 1. Dat IP tinh: 192.168.1.10 (de ket noi may cham cong)
echo 2. Khoi phuc IP tu dong (DHCP)
echo 3. Thoat
echo.
set /p choice="Chon (1/2/3): "

if "%choice%"=="1" goto set_static
if "%choice%"=="2" goto restore_dhcp
if "%choice%"=="3" goto exit

echo Lua chon khong hop le!
pause
exit /b

:set_static
echo.
echo Dang doi IP thanh 192.168.1.10...
echo (Can chay voi quyen Administrator)
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0set-static-ip.ps1"
pause
exit /b

:restore_dhcp
echo.
echo Dang khoi phuc IP ve DHCP...
echo (Can chay voi quyen Administrator)
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0restore-dhcp.ps1"
pause
exit /b

:exit
exit /b
