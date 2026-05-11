@echo off
chcp 1252 >nul
echo === FIX 32-bit DLL ===
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Run as Administrator!
    pause
    exit /b 1
)

echo [1] Stopping processes...
taskkill /f /im TestConnect.exe 2>nul
taskkill /f /im ZKComBridge.exe 2>nul
timeout /t 1 /nobreak >nul
echo [OK]

echo.
echo [2] Unregister old DLL...
regsvr32 "C:\Windows\SysWOW64\zkemkeeper.dll" /u /s 2>nul
echo [OK]

echo.
echo [3] Copy 32-bit DLL from C:\ZKCollector\...
xcopy "C:\ZKCollector\zkemkeeper.dll" "C:\Windows\SysWOW64\" /Y /F
echo [OK]

echo.
echo [4] Register 32-bit DLL...
C:\Windows\SysWOW64\regsvr32 "C:\Windows\SysWOW64\zkemkeeper.dll" /s
echo [OK]

echo.
echo [5] Verify DLL architecture...
powershell -Command "$b=[IO.File]::ReadAllBytes('C:\Windows\SysWOW64\zkemkeeper.dll'); $o=[BitConverter]::ToInt32($b,0x3C); $m=[BitConverter]::ToUInt16($b,$o+4); if($m-eq0x14c){'[SUCCESS] Now 32-bit!'}elseif($m-eq0x8664){'[ERROR] Still 64-bit'}else{'Unknown: '+[Convert]::ToString($m,16)}"

echo.
echo === FIX COMPLETE ===
echo.
echo Test now:
echo   cd C:\ZKCollector\TestConnect
echo   .\bin\Debug\net472\TestConnect.exe
echo.
pause
