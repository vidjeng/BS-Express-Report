@echo off
title BS Express Daily Report Service (Google Chrome Dedicated)
color 0B
echo =======================================================
echo         BS EXPRESS DAILY REPORT SERVICE
echo            (Dedicated for Google Chrome)
echo =======================================================
echo.
echo Starting local web server on port 3000...
echo.
echo   Localhost:     http://localhost:3000
echo   Local Network: http://192.168.1.67:3000  (For phones/devices on same Wi-Fi)
echo.

:: Launch directly in Google Chrome App mode (Clean desktop window)
start "" chrome --app="http://localhost:3000" 2>nul || start "" chrome "http://localhost:3000" 2>nul || start "" http://localhost:3000

:: Start Node.js static server
node server.js

pause
