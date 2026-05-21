@echo off
echo ========================================
echo Dang ky ZKTeco SDK
echo ========================================
echo.
echo Yeu cau: Chay voi quyen Administrator!
echo.
pause

echo [1] Dang ky zkemkeeper.dll (64-bit)...
regsvr32.exe /s "C:\WINDOWS\sysWOW64\zkemkeeper.dll"
if %errorlevel% neq 0 (
    echo    ✗ Loi dang ky 64-bit
    goto end
)
echo    ✓ Dang ky 64-bit thanh cong

:end
echo.
echo ========================================
echo Hoan tat. Nhan phim bat ky de thoat.
echo ========================================
pause
