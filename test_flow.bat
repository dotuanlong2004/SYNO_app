@echo off
setlocal

echo [1/3] Starting backend...
start "backend-api" cmd /k "cd /d %~dp0backend && npm start"

echo [2/3] Starting admin_web (React)...
start "admin-web" cmd /k "cd /d %~dp0admin_web && npm run dev -- --port 5174"

echo [3/3] Starting parent web (Flutter on Chrome port 8080)...
if exist "%~dp0flutter-sdk\bin\flutter.bat" (
  start "parent-flutter-web" cmd /k "cd /d %~dp0attendance_app && %~dp0flutter-sdk\bin\flutter.bat run -d chrome --web-port 8080"
) else (
  if exist "D:\tools\flutter\bin\flutter.bat" (
    start "parent-flutter-web" cmd /k "cd /d %~dp0attendance_app && D:\tools\flutter\bin\flutter.bat run -d chrome --web-port 8080"
  ) else (
    where flutter >nul 2>&1
    if %errorlevel%==0 (
      start "parent-flutter-web" cmd /k "cd /d %~dp0attendance_app && flutter run -d chrome --web-port 8080"
    ) else (
      echo [CANH BAO] Khong tim thay Flutter (local/global).
      echo [CANH BAO] Da cai mac dinh tai: D:\tools\flutter\bin\flutter.bat
      echo [CANH BAO] Hoac dat lai local SDK tai: %~dp0flutter-sdk\bin\flutter.bat
    )
  )
)

echo.
echo ==========================================
echo Da khoi dong xong moi truong test:
echo Backend API      : http://127.0.0.1:3000
echo Admin Web        : http://127.0.0.1:5174
echo Parent Flutter   : http://127.0.0.1:8080
echo ==========================================
echo.

endlocal
