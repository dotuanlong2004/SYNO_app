@echo off
chcp 1252 >nul
echo ===========================================
echo FIX COM Registry - 32-bit zkemkeeper.dll
echo ===========================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Run as Administrator!
    pause
    exit /b 1
)

echo [1/4] Check current DLL...
echo.
echo Registry 64-bit:
reg query "HKCR\CLSID\{00853A19-BD51-419B-9269-2DABE57EB61F}\InprocServer32" /ve 2>nul

echo.
echo Registry 32-bit:
reg query "HKCR\Wow6432Node\CLSID\{00853A19-BD51-419B-9269-2DABE57EB61F}\InprocServer32" /ve 2>nul

echo.
echo [2/4] Unregister old...
regsvr32 "C:\Windows\SysWOW64\zkemkeeper.dll" /u /s 2>nul
regsvr32 "C:\ZKCollector\zkemkeeper.dll" /u /s 2>nul
echo [OK]

echo.
echo [3/4] Delete old keys...
reg delete "HKCR\CLSID\{00853A19-BD51-419B-9269-2DABE57EB61F}" /f 2>nul
reg delete "HKCR\Wow6432Node\CLSID\{00853A19-BD51-419B-9269-2DABE57EB61F}" /f 2>nul
echo [OK]

echo.
echo [4/4] Create new Registry keys...

reg add "HKCR\Wow6432Node\CLSID\{00853A19-BD51-419B-9269-2DABE57EB61F}" /ve /d "zkemkeeper" /f >nul
reg add "HKCR\Wow6432Node\CLSID\{00853A19-BD51-419B-9269-2DABE57EB61F}\InprocServer32" /ve /d "C:\ZKCollector\zkemkeeper.dll" /f >nul
reg add "HKCR\Wow6432Node\CLSID\{00853A19-BD51-419B-9269-2DABE57EB61F}\InprocServer32" /v ThreadingModel /d "Apartment" /f >nul

reg add "HKCR\Wow6432Node\CLSID\{00853A19-BD51-419B-9269-2DABE57EB61F}\ProgID" /ve /d "zkemkeeper.ZKEM" /f >nul
echo [OK] Registry created

echo.
echo [BONUS] Register with regsvr32...
C:\Windows\SysWOW64\regsvr32 "C:\ZKCollector\zkemkeeper.dll" /s
if errorlevel 1 (
    echo [WARN] regsvr32 failed, but Registry was created manually
) else (
    echo [OK] regsvr32 succeeded
)

echo.
echo ===========================================
echo FIX COMPLETE!
echo ===========================================
echo.
echo Run test:
echo   cd C:\ZKCollector\TestConnect
echo   .\bin\Debug\net472\TestConnect.exe
echo.
pause
