@echo off
cd /d "%~dp0.."
echo ========================================
echo Ronald Jack AI-X1 Collector
echo MITA Migration - Node.js SDK
echo ========================================
echo.

if not exist .env (
    echo Creating .env...
    (
        echo ZK_DEVICE_IP=192.168.0.225
        echo ZK_DEVICE_PORT=4370
        echo SUPABASE_URL=https://your-project.supabase.co
        echo SUPABASE_SERVICE_KEY=your-service-key
        echo SCHOOL_ID=1
    ) > .env
    echo Please edit .env with your Supabase credentials
echo.
)

echo Checking pnpm workspace dependencies...
call corepack pnpm install 2>nul || echo Dependencies should be installed from repository root.

echo.
echo Starting collector...
echo Device: Ronald Jack AI-X1 @ 192.168.0.225:4370
echo Features: Auto Vao/Ra + 10min debounce
echo.
echo Press Ctrl+C to stop
echo.

corepack pnpm exec tsx scripts/collector.ts
pause
