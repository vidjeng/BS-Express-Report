@echo off
title BS Express - Cloudflare Public Tunnel
echo ========================================================
echo   BS Express Report - Cloudflare Public Server Tunnel
echo ========================================================
echo.
echo Starting Cloudflare Tunnel forwarding to http://localhost:3000...
echo.
if not exist "cloudflared.exe" (
    echo Error: cloudflared.exe not found!
    pause
    exit /b 1
)

.\cloudflared.exe tunnel --url http://localhost:3000
pause
