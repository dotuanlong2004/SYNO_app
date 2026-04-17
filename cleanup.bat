@echo off
echo Cleaning Flutter...
cd attendance_app
call flutter clean
echo Cleaning Node modules (production only)...
cd ../backend
call npm prune --production
cd ../zk-agent
call npm prune --production
cd ..
echo Cleanup complete!
