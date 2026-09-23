Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "         BS EXPRESS DAILY REPORT SERVICE               " -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting local web server on port 3000..." -ForegroundColor Green
Write-Host "  Localhost:     http://localhost:3000" -ForegroundColor White
Write-Host "  Local Network: http://192.168.1.67:3000 (Same Wi-Fi/LAN)" -ForegroundColor Cyan
Write-Host ""

# Open browser
Start-Process "http://localhost:3000"

# Start Node server
node server.js
