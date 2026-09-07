Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   BS EXPRESS UNIFIED PORTAL & FIXED ASSET SERVICE     " -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Start Fixed Asset Laravel Server on Port 8000 if not running
$faPort = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if (-not $faPort) {
    Write-Host "[1/2] Starting Fixed Asset System Server on Port 8000..." -ForegroundColor Green
    Start-Process -FilePath "php" -ArgumentList "artisan serve --host=0.0.0.0 --port=8000" -WorkingDirectory (Join-Path $PSScriptRoot "fixasset") -WindowStyle Minimized
    Start-Sleep -Seconds 2
} else {
    Write-Host "[1/2] Fixed Asset System Server is already running on Port 8000." -ForegroundColor Cyan
}

# 2. Start Daily Report Node server
Write-Host "[2/2] Starting Daily Report Server on Port 3000..." -ForegroundColor Green
Write-Host "  🌐 Unified Portal:   http://localhost:3000" -ForegroundColor White
Write-Host "  📦 Fixed Asset App:  http://localhost:8000" -ForegroundColor Yellow
Write-Host "  📱 Local Network:    http://192.168.1.67:3000 (Same Wi-Fi/LAN)" -ForegroundColor Cyan
Write-Host ""

# Open browser
Start-Process "http://localhost:3000"

# Start Node server
node server.js
