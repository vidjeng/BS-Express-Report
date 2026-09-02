@echo off
title Deploy to Cloudflare Pages - BS Express Report
echo ========================================================
echo   BS Express Report - Cloudflare Pages Deployment
echo ========================================================
echo.
echo Deploying project to Cloudflare Pages...
echo.
call npx wrangler pages deploy . --project-name bs-express-report --commit-dirty=true
echo.
echo ========================================================
echo   Deployment Complete!
echo ========================================================
pause
