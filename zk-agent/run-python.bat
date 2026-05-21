@echo off
chcp 65001 >nul
echo ========================================
echo ZK Pull Tool - Lay du lieu tu may cham cong
echo ========================================
echo.

:: Kiem tra Python
echo [1] Kiem tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo    ✗ Python chua duoc cai dat!
    echo    Tai Python tu: https://www.python.org/downloads/
    echo    Hoac cai qua Microsoft Store
    pause
    exit /b 1
)
echo    ✓ Python da cai dat

:: Cai dat thu vien
echo.
echo [2] Cai dat thu vien Python...
echo    - pyzk (de ket noi may cham cong)
echo    - requests (de gui len Supabase)
echo    - python-dotenv (de doc file .env)
python -m pip install pyzk requests python-dotenv --quiet
if errorlevel 1 (
    echo    ✗ Loi cai dat thu vien
    pause
    exit /b 1
)
echo    ✓ Da cai dat thu vien

:: Chay tool
echo.
echo [3] Chay tool...
echo ========================================
python zk_pull.py
echo ========================================
echo.

pause
