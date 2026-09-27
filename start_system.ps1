# PowerShell Launch Script for Aquaponics Monitoring System
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SMART AQUAPONICS MONITORING & INTELLIGENCE SYSTEM V1.0  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $CurrentDir

# 1. Start Backend FastAPI Server
Write-Host "[1/2] Starting Python FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
$BackendVenvPython = Join-Path $CurrentDir "backend\.venv\Scripts\python.exe"

if (-not (Test-Path $BackendVenvPython)) {
    Write-Host "Error: Virtual environment not found at $BackendVenvPython. Run pip install first." -ForegroundColor Red
    Exit 1
}

# Start backend in a new background window
Start-Process -FilePath $BackendVenvPython -ArgumentList "run.py" -WorkingDirectory (Join-Path $CurrentDir "backend")

Start-Sleep -Seconds 3

# 2. Launch Browser
Write-Host "[2/2] Opening Aquaponics OS in your default web browser..." -ForegroundColor Green
Start-Process "http://localhost:8000"

Write-Host "`nSystem is fully operational!" -ForegroundColor Cyan
Write-Host "Dashboard: http://localhost:8000" -ForegroundColor White
Write-Host "API Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "WebSocket: ws://localhost:8000/ws" -ForegroundColor White
