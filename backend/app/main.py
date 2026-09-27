"""
Main FastAPI Application Entrypoint.
Aquaponics Monitoring System V1.
IoT sensor acquisition, manual plant growth tracking, baseline ML anomaly detection,
and real-time WebSocket broadcasting.
"""

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import init_db
from app.ml.sensor_anomaly import sensor_ml_engine
from app.services.simulator import simulator
from app.services.websocket_manager import ws_manager

from app.routers import sensors, plants, alerts, analytics, system, ml, fish

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown orchestration:
    1. Initialize SQLite database tables.
    2. Seed initial history for UI/chart testing (tagged as demo).
    3. Load ML baseline prototype model into RAM.
    4. Start background simulator task for DEMO MODE.
    """
    print("==================================================")
    print("    AQUAPONICS MONITORING SYSTEM V1 (CLEAN)       ")
    print(f" Mode: {settings.APP_MODE.upper()}")
    print("==================================================")

    # 1. Initialize SQLite Database
    init_db()

    # 2. Seed initial history if clean install
    simulator.seed_initial_history(hours=48)

    # 3. Load ML baseline model into memory
    sensor_ml_engine.load_model()

    # 4. Start background simulation loop
    sim_task = asyncio.create_task(simulator.run_simulation_loop())

    yield

    # Shutdown
    simulator.is_running = False
    sim_task.cancel()
    print("[Shutdown] Aquaponics backend stopped cleanly.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Aquaponics IoT Telemetry, Manual Plant Growth Tracking, and Baseline Machine Learning Anomaly Detection Platform.",
    lifespan=lifespan
)

# Enable CORS for local web applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(sensors.router, prefix=settings.API_V1_STR)
app.include_router(plants.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(system.router, prefix=settings.API_V1_STR)
app.include_router(ml.router, prefix=settings.API_V1_STR)
app.include_router(fish.router, prefix=settings.API_V1_STR)

# Real-time WebSocket endpoint
@app.websocket("/ws")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """WebSocket stream for low-latency live telemetry & alert broadcasting."""
    await ws_manager.connect(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# Check if production frontend dist exists to serve unified web application
frontend_dist = settings.BASE_DIR.parent / "frontend" / "dist"
if (frontend_dist / "index.html").exists():
    if (frontend_dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="frontend_assets")

    @app.get("/")
    def serve_frontend_index():
        return FileResponse(str(frontend_dist / "index.html"))

    @app.get("/api")
    def api_info():
        return {
            "system": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "status": "OPERATIONAL",
            "documentation": "/docs",
            "mode": settings.APP_MODE
        }
else:
    @app.get("/")
    def root():
        return {
            "system": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "status": "OPERATIONAL",
            "documentation": "/docs",
            "mode": settings.APP_MODE
        }
