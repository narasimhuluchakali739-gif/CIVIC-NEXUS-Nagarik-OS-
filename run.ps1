Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  CIVIC-NEXUS: Autonomous Civic Infrastructure OS" -ForegroundColor Green
Write-Host "  Launching Standalone Server on http://localhost:8000" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Set-Location "$PSScriptRoot\backend"

python standalone_server.py 8000
