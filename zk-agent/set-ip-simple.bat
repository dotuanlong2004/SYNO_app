@echo off
chcp 65001 >nul
echo ==========================================
echo   DOI IP SANG 192.168.1.10
echo ==========================================
echo.
echo Dang tim adapter WiFi/Ethernet...
echo.

:: Tim adapter dang hoat dong
for /f "tokens=1,2 delims=:" %%a in ('ipconfig ^| findstr /i "Wi-Fi\|Ethernet\|Wireless"') do (
    echo Adapter: %%a
)

echo.
echo IP hien tai:
ipconfig | findstr /i "ipv4"
echo.
echo ==========================================
echo LENH NETSH DE DOI IP
echo ==========================================
echo.
echo Chay 2 lenh sau trong PowerShell (Admin):
echo.
echo 1. Xoa IP cu:
echo    netsh interface ip set address "Wi-Fi" dhcp
echo.
echo 2. Dat IP tinh:
echo    netsh interface ip set address "Wi-Fi" static 192.168.1.10 255.255.255.0 192.168.1.1
echo.
echo    netsh interface ip set dns "Wi-Fi" static 8.8.8.8
echo.
echo ==========================================
echo.
echo Hoac chay truc tiep (thay "Wi-Fi" bang ten adapter cua ban):
echo.
netsh interface ip set address name="Wi-Fi" source=static addr=192.168.1.10 mask=255.255.255.0 gateway=192.168.1.1
echo.
pause
