@echo off
:: ============================================================
:: run.bat - Chay ZK Agent voi Python 3.11 32-bit
:: Su dung:
::   run.bat --ping       <- Kiem tra ket noi may cham cong
::   run.bat --pull       <- Keo du lieu va day len Supabase
::   run.bat --daemon     <- Chay lien tuc (polling 30 giay)
:: ============================================================
"C:\Program Files (x86)\Python311-32\python.exe" zk_agent\main.py %*
