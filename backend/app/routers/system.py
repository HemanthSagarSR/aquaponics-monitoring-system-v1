"""
System Status & Mode Management Router for Aquaponics Monitoring System V1.
Tracks heartbeat and connectivity across ESP32, Host FastAPI Server, Database, and ML Engine.
Allows switching between LIVE HARDWARE MODE (ESP32) and DEMO MODE (bench simulator).
"""

from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.config import settings
from app.models.orm_models import SystemStatus, SensorReading, Alert, PlantObservation
from app.models.schemas import AppModeToggleRequest
from app.services.alert_engine import alert_engine

router = APIRouter(prefix="/system", tags=["System"])

@router.get("/status")
def get_system_status(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns unified health and connectivity diagnostics for all architectural components:
    ESP32 Node, FastAPI Backend Server, SQLite Database, and ML Baseline Engine.
    Strictly free from Raspberry Pi or camera components.
    """
    now = datetime.utcnow()

    # Query last sensor reading timestamp
    latest_reading = db.query(SensorReading).order_by(desc(SensorReading.timestamp)).first()
    seconds_ago: Optional[float] = None
    if latest_reading:
        seconds_ago = round((now - latest_reading.timestamp).total_seconds(), 1)

    # Active alerts count
    active_alerts = db.query(Alert).filter(Alert.status == "ACTIVE").count()
    critical_alerts = db.query(Alert).filter(Alert.status == "ACTIVE", Alert.severity == "CRITICAL").count()

    # ESP32 connectivity state
    esp_status = "ONLINE"
    if settings.APP_MODE.lower() == "live":
        if seconds_ago is None or seconds_ago > settings.ESP32_OFFLINE_TIMEOUT_SECONDS:
            esp_status = "OFFLINE"
            # Trigger watchdog alert if needed
            if latest_reading:
                alert_engine.check_esp32_watchdog(db, latest_reading.timestamp)
    else:
        esp_status = "ONLINE (DEMO)"

    # Compute overall status
    if critical_alerts > 0:
        overall_status = "CRITICAL"
    elif active_alerts > 0 or esp_status == "OFFLINE":
        overall_status = "WARNING"
    else:
        overall_status = "NORMAL"

    total_readings = db.query(SensorReading).count()
    total_plants = db.query(PlantObservation).count()

    components = {
        "esp32": {
            "name": "ESP32 IoT Sensor Node",
            "status": esp_status,
            "last_heartbeat": latest_reading.timestamp.isoformat() if latest_reading else None,
            "latency_seconds": seconds_ago,
            "details": f"Device: {latest_reading.device_id if latest_reading else 'ESP32_AQUA_01'} | Pinout: DS18B20(4), DHT11(15), pH(34), WaterLvl(35), P31 Float(13)"
        },
        "backend_server": {
            "name": "FastAPI Host Server",
            "status": "ONLINE",
            "last_heartbeat": now.isoformat(),
            "latency_seconds": 0.0,
            "details": f"FastAPI v{settings.VERSION} running on local development computer"
        },
        "database": {
            "name": "SQLite Database",
            "status": "ONLINE",
            "last_heartbeat": now.isoformat(),
            "details": f"{total_readings} sensor readings, {total_plants} manual plant observations"
        },
        "ml_engine": {
            "name": "Isolation Forest Anomaly Detector",
            "status": "ONLINE",
            "last_heartbeat": now.isoformat(),
            "details": "Modular baseline prototype pending empirical hardware calibration"
        }
    }

    return {
        "app_mode": settings.APP_MODE,
        "overall_status": overall_status,
        "last_sensor_update_seconds_ago": seconds_ago,
        "total_readings_stored": total_readings,
        "active_alerts_count": active_alerts,
        "critical_alerts_count": critical_alerts,
        "components": components,
        "timestamp": now.isoformat()
    }

@router.post("/mode")
def set_application_mode(req: AppModeToggleRequest) -> Dict[str, Any]:
    """Toggle between LIVE HARDWARE MODE (ESP32) and DEMO MODE (simulator)."""
    settings.APP_MODE = req.mode.lower()
    return {
        "success": True,
        "current_mode": settings.APP_MODE,
        "message": f"Application switched to {settings.APP_MODE.upper()} mode."
    }
