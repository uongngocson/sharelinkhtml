@echo off
echo Stopping HTML Share Hub (Port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a
)
echo Done!
pause
