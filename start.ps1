Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "         BS EXPRESS DAILY REPORT SERVICE               " -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting local web server on port 3000..." -ForegroundColor Green
Write-Host "URL: http://localhost:3000" -ForegroundColor White
Write-Host ""

# Open browser
Start-Process "http://localhost:3000"

# Start Node server
node server.js
