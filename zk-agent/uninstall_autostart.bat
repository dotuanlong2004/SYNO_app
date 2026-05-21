@echo off
echo Dang go cai dat ZK Agent autostart...
schtasks /delete /tn "ZKAgent" /f
if %errorlevel% == 0 (
    echo [OK] Da go cai dat thanh cong.
) else (
    echo [LOI] Khong tim thay task ZKAgent.
)
pause
