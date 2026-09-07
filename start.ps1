Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   BS EXPRESS UNIFIED PORTAL & FIXED ASSET SERVICE     " -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Start Unified BS Express System Server on Port 3000
Write-Host "[1/1] Starting Unified BS Express Server on Port 3000..." -ForegroundColor Green
Write-Host "  🌐 Unified System:   http://localhost:3000" -ForegroundColor White
Write-Host "  📱 Local Network:    http://192.168.1.67:3000 (Same Wi-Fi/LAN)" -ForegroundColor Cyan
Write-Host "  ☁️ Cloudflare Live:  https://bs-express-report.pages.dev" -ForegroundColor Yellow
Write-Host ""

# Open browser
Start-Process "http://localhost:3000"

# Start Node server
node server.js
