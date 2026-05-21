@echo off
echo Dang cai dat ZK Agent tu dong chay khi khoi dong may...

schtasks /create /tn "ZKAgent" ^
  /tr "\"C:\Python314\python.exe\" \"D:\attendance_app_dev\zk-agent\zk_agent\main.py\" --daemon --interval 30" ^
  /sc ONSTART ^
  /ru SYSTEM ^
  /rl HIGHEST ^
  /f

if %errorlevel% == 0 (
    echo [OK] Da cai dat thanh cong!
    echo ZK Agent se tu dong chay moi khi bat may.
) else (
    echo [LOI] Cai dat that bai. Hay chay file nay voi quyen Administrator.
)

echo.
echo Chay ngay bay gio...
schtasks /run /tn "ZKAgent"
echo Xong.
pause
