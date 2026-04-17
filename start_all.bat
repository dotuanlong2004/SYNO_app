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

echo.
echo ==========================================
echo Services started successfully!
echo Backend API : http://127.0.0.1:3000
echo Admin Web   : http://127.0.0.1:5174
echo ==========================================
echo.

endlocal
