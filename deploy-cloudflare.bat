@echo off
title Deploy to Cloudflare Pages - BS Express Report
echo ========================================================
echo   BS Express Report - Cloudflare Pages Deployment
echo ========================================================
echo.
echo Preparing web distribution folder...
if not exist dist mkdir dist
copy /y index.html dist\ >nul
copy /y manifest.json dist\ >nul
robocopy css dist\css /e /ndl /njh /njs /nc /ns /np >nul
robocopy js dist\js /e /ndl /njh /njs /nc /ns /np >nul
robocopy assets dist\assets /e /ndl /njh /njs /nc /ns /np >nul

echo Deploying project to Cloudflare Pages...
echo.
call npx wrangler pages deploy dist --project-name bs-express-report --commit-dirty=true
echo.
echo ========================================================
echo   Deployment Complete!
echo ========================================================
pause
