@echo off
title Deploy to Cloudflare Pages - BS Express Report
echo ========================================================
echo   BS Express Report - Cloudflare Pages Deployment
echo ========================================================
echo.
echo [1/3] Checking Cloudflare authentication...
call npx wrangler whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo --------------------------------------------------------
    echo [!] You are not authenticated with Cloudflare yet.
    echo Opening your browser to log in...
    echo (Click "Allow" or "Authorize" in the browser tab)
    echo --------------------------------------------------------
    echo.
    call npx wrangler login
    if %errorlevel% neq 0 (
        echo.
        echo [X] Login was cancelled or failed.
        pause
        exit /b 1
    )
)
echo [+] Cloudflare account is authenticated!
echo.
echo [2/3] Preparing web distribution folder (dist)...
if not exist dist mkdir dist
copy /y index.html dist\ >nul
copy /y manifest.json dist\ >nul
robocopy css dist\css /e /ndl /njh /njs /nc /ns /np >nul
robocopy js dist\js /e /ndl /njh /njs /nc /ns /np >nul
robocopy assets dist\assets /e /ndl /njh /njs /nc /ns /np >nul
robocopy functions dist\functions /e /ndl /njh /njs /nc /ns /np >nul

echo.
echo [3/3] Deploying project to Cloudflare Pages...
echo.
call npx wrangler pages deploy dist --project-name bs-express-report --commit-dirty=true
echo.
echo ========================================================
echo   Deployment Complete!
echo   Production URL: https://bs-express-report.pages.dev
echo ========================================================
pause

