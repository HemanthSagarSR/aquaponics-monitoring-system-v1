#!/usr/bin/env bash
# Shell Launch Script for Aquaponics Monitoring System (Linux / macOS)
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "  SMART AQUAPONICS MONITORING & INTELLIGENCE SYSTEM V1.0  "
echo "=========================================================="

echo "[1/2] Starting Python FastAPI Backend on http://0.0.0.0:8000..."
cd backend
source .venv/bin/activate
python run.py &

sleep 2

echo "[2/2] System is operational!"
echo "Dashboard: http://localhost:8000"
echo "API Docs:  http://localhost:8000/docs"
echo "WebSocket: ws://localhost:8000/ws"
