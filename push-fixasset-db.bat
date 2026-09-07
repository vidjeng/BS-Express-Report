@echo off
title Push Fixed Asset Database to System - BS Express
chcp 65001 >nul
echo ========================================================
echo   BS Express - Push Fixed Asset Database to System
echo ========================================================
echo.
echo Checking Node.js and MySQL connectivity...
node -v >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH!
  pause
  exit /b 1
)

echo.
echo Running automated sync & push script...
node db/sync_and_push_fixasset.cjs
if errorlevel 1 (
  echo.
  echo [ERROR] Script failed. Please make sure MySQL is running on port 3306!
  pause
  exit /b 1
)

echo.
echo [Optional] Do you want to deploy the updated app to Cloudflare Pages now?
set "DEPLOY_CHOICE=Y"
set /p DEPLOY_CHOICE="Deploy to Cloudflare Pages? (Y/N, default Y): "
if /i "%DEPLOY_CHOICE%"=="N" goto finish

call deploy-cloudflare.bat

:finish
echo.
echo ========================================================
echo   Database push process completed successfully!
echo ========================================================
pause
