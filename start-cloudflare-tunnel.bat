@echo off
title BS Express - Cloudflare Public Tunnel
echo ========================================================
echo   BS Express Report - Cloudflare Public Server Tunnel
echo ========================================================
echo.
if not exist "cloudflared.exe" (
    echo [X] Error: cloudflared.exe not found!
    pause
    exit /b 1
)

:: Check if local server is listening on port 3000
netstat -ano | findstr :3000 | findstr LISTENING >nul 2>&1
if %errorlevel% neq 0 (
    echo [i] BS Express server is not running on port 3000.
    echo Starting local Node.js server in background...
    start "BS Express Server" /min cmd /c "node server.js"
    timeout /t 3 /nobreak >nul
)

echo Starting Cloudflare Public Tunnel forwarding to http://localhost:3000...
echo -------------------------------------------------------------------------
echo Once connected, look for your public link below:
echo Example: https://xxxxxxxxxxxx.trycloudflare.com
echo -------------------------------------------------------------------------
echo.

.\cloudflared.exe tunnel --url http://localhost:3000
pause

