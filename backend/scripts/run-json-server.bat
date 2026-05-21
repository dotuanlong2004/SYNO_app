@echo off
cd /d "%~dp0.."
echo ========================================
echo Ronald Jack JSON Receiver
echo Port: 5005
echo ========================================
echo.

call corepack pnpm install 2>nul || echo Dependencies should be installed from repository root.

echo.
echo Starting HTTP server on port 5005...
echo.
echo Cau hinh may cham cong:
echo   IP Server: %COMPUTERNAME% hoac IP may tinh nay
echo   Port Server: 5005
echo   Chuc nang noi tiep: Gui JSON
echo.
echo May cham cong se push data den day!
echo.

corepack pnpm exec tsx scripts/json-server.ts
pause
