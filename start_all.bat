@echo off
setlocal

echo [1/4] Starting Docker services...
docker start postgres-db redis-server >nul 2>&1

echo [2/4] Installing backend dependencies...
cd /d "%~dp0backend"
call npm install

echo [3/4] Installing admin_web dependencies...
cd /d "%~dp0admin_web"
call npm install

echo [4/4] Launching backend and admin web...
start "backend-api" cmd /k "cd /d %~dp0backend && npm start"
start "admin-web" cmd /k "cd /d %~dp0admin_web && npm run dev -- --port 5174"

echo [5/6] Starting Collector (Ronald Jack AI-X1)...
start "collector" cmd /k "cd /d %~dp0backend && node scripts/collector.js"
timeout /t 3 /nobreak >nul

echo [6/6] Starting Flutter App...
echo Step 1: Launching emulator (Pixel8) - wait ~40s for boot...
start "emulator-start" cmd /k "cd /d %~dp0attendance_app && flutter emulators --launch Pixel8 && timeout /t 40 /nobreak && echo Emulator ready. Keep this window open."
timeout /t 45 /nobreak >nul

echo Step 2: Running Flutter app on emulator...
start "flutter-app" cmd /k "cd /d %~dp0attendance_app && flutter run -d emulator-5554 2>nul || flutter run -d emulator || flutter run"

echo.
echo ==========================================
echo All services started!
echo Backend API : http://127.0.0.1:3000
echo Admin Web   : http://127.0.0.1:5174
echo Flutter App : Emulator (wait ~30s)
echo ==========================================
echo.
pause

endlocal
