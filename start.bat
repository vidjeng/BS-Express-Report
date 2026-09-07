@echo off
title BS Express - Unified Daily Report & Fixed Asset System
chcp 65001 >nul
color 0B
echo =======================================================
echo     BS EXPRESS UNIFIED PORTAL & FIXED ASSET SYSTEM
echo            (Dedicated for Google Chrome)
echo =======================================================
echo.

:: 1. Check and start Fixed Asset Laravel Server on Port 8000
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if errorlevel 1 (
  echo [1/2] Starting Fixed Asset System Server (Port 8000)...
  start /min "BS Fixed Asset Server (Port 8000)" cmd /c "cd /d \"%~dp0fixasset\" && php artisan serve --host=0.0.0.0 --port=8000"
  timeout /t 2 /nobreak >nul
) else (
  echo [1/2] Fixed Asset System Server is already running on Port 8000.
)

:: 2. Start Daily Report Node Server on Port 3000
echo [2/2] Starting Daily Report Server (Port 3000)...
echo.
echo   🌐 Unified Portal:   http://localhost:3000
echo   📦 Fixed Asset App:  http://localhost:8000
echo   📱 Local Network:    http://192.168.1.67:3000
echo.

:: Launch directly in Google Chrome App mode (Clean desktop window)
start "" chrome --app="http://localhost:3000" 2>nul || start "" chrome "http://localhost:3000" 2>nul || start "" http://localhost:3000

:: Start Node.js server
node server.js

pause
