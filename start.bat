@echo off
title BS Express - Unified Daily Report & Fixed Asset System
chcp 65001 >nul
color 0B
echo =======================================================
echo     BS EXPRESS UNIFIED PORTAL & FIXED ASSET SYSTEM
echo            (Dedicated for Google Chrome)
echo =======================================================
echo.

:: 1. Start Unified BS Express System Server on Port 3000
echo [1/1] Starting Unified BS Express Server (Port 3000)...
echo.
echo   🌐 Unified System:   http://localhost:3000
echo   📱 Local Network:    http://192.168.1.67:3000
echo   ☁️ Cloudflare Live:  https://bs-express-report.pages.dev
echo.

:: Launch directly in Google Chrome App mode (Clean desktop window)
start "" chrome --app="http://localhost:3000" 2>nul || start "" chrome "http://localhost:3000" 2>nul || start "" http://localhost:3000

:: Start Node.js server
node server.js

pause
