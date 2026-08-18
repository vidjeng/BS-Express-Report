@echo off
title Open BS Express in Google Chrome
echo ===================================================
echo     Launching BS Express in Google Chrome
echo ===================================================
echo.

:: Try opening via local server first or directly as Chrome App
start "" chrome --app="http://localhost:3000" 2>nul || start "" chrome "http://localhost:3000" 2>nul || start "" chrome --app="%~dp0index.html" 2>nul || start "" chrome "%~dp0index.html" 2>nul || start "" "%~dp0index.html"

echo Launched successfully in Google Chrome.
timeout /t 2 >nul
