@echo off
cd /d "%~dp0mita-collector-csharp"
echo ========================================
echo MITA Pro Collector (C# + PostgreSQL)
echo Ronald Jack AI-X1 - VPS 63.250.53.83
echo ========================================
echo.

dotnet --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Install .NET 6.0+ first: https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

echo [1/2] Building...
dotnet build -c Release
if errorlevel 1 (
    echo [ERROR] Build failed. Check SDK registration:
    echo   regsvr32 C:\Windows\SysWOW64\zkemkeeper.dll
    pause
    exit /b 1
)

echo.
echo [2/2] Starting...
echo Device: %ZK_DEVICE_IP%:%ZK_DEVICE_PORT%
echo PostgreSQL: VPS 63.250.53.83
echo.
dotnet run --no-build

pause
