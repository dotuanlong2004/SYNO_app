@echo off
:: Chay file nay bang cach: chuot phai -> "Run as administrator"
echo ================================================
echo  Dang chay pywin32 postinstall (can Admin)...
echo ================================================

"C:\Program Files (x86)\Python311-32\python.exe" -m pip install pywin32 --upgrade --force-reinstall

"C:\Program Files (x86)\Python311-32\python.exe" "C:\Users\%USERNAME%\AppData\Roaming\Python\Python311-32\site-packages\win32\scripts\pywin32_postinstall.py" -install

echo.
echo ================================================
echo  Xong! Thu chay ping:
echo  py -3.11-32 zk_agent/main.py --ping
echo ================================================
pause
