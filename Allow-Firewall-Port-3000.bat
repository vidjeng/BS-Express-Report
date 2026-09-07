@echo off
title Allow BS Express Port 3000 in Windows Firewall
echo =========================================================================
echo   BS Express Report - Configure Windows Firewall for Same Network
echo =========================================================================
echo.

:: Check for administrative privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator privileges to add Windows Firewall rule...
    powershell -Command "Start-Process cmd -ArgumentList '/c netsh advfirewall firewall add rule name=\"\"BS Express Server (Port 3000)\"\" dir=in action=allow protocol=TCP localport=3000 && echo. && echo Windows Firewall Rule Added Successfully! && pause' -Verb RunAs"
    exit /b
)

netsh advfirewall firewall add rule name="BS Express Server (Port 3000)" dir=in action=allow protocol=TCP localport=3000
echo.
echo =========================================================================
echo   Port 3000 has been successfully allowed in Windows Firewall!
echo   All computers, tablets, and phones on the same Wi-Fi/LAN can now access:
echo.
echo   URL: http://192.168.1.67:3000
echo =========================================================================
echo.
pause
