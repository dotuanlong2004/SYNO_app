@echo off
echo Simulating hardware attendance scan for HS001...
curl -X POST http://127.0.0.1:3000/api/v1/attendance/sync ^
  -H "Content-Type: application/json" ^
  -d "{\"student_code\":\"HS001\"}"
echo.
pause
