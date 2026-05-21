@echo off
cd /d "%~dp0collector-csharp"
echo ========================================
echo Ronald Jack AI-X1 Collector (C# SDK)
echo ========================================
echo.

echo [1/3] Checking .NET...
dotnet --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] .NET SDK not installed!
    echo Download: https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

echo [2/3] Building...
dotnet build -c Release
if errorlevel 1 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo.
echo [3/3] Running...
echo Device: %ZK_DEVICE_IP%:%ZK_DEVICE_IP%
echo.

dotnet run --no-build
pause
