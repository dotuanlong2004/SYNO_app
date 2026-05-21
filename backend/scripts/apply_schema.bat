@echo off
chcp 65001 >nul
echo ===========================================
echo APPLY SUPABASE SCHEMA
echo ===========================================
echo.
echo Vui long chay file SQL nay trong Supabase Dashboard:
echo.
echo 1. Mo trinh duyet: https://supabase.com/dashboard
echo 2. Chon project
echo 3. Vao SQL Editor
echo 4. Copy noi dung file: backend\supabase\FINAL_SCHEMA.sql
echo 5. Paste va nhan Run
echo.
echo Hoac neu co psql:
echo psql -h [host] -U postgres -d postgres -f ..\supabase\FINAL_SCHEMA.sql
echo.
pause
