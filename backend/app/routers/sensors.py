"""
Sensors Router for Aquaponics Monitoring System V1.
Handles physical IoT data ingestion from ESP32, persistence into SQLite,
modular baseline ML inference, real-time alerting, and historical queries.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.orm_models import SensorReading, MLPrediction, SystemStatus
from app.models.schemas import (
    SensorReadingCreate, SensorReadingResponse, SensorReadingAck
)
from app.ml.sensor_anomaly import sensor_ml_engine
from app.services.alert_engine import alert_engine
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/sensors", tags=["Sensors"])

@router.post("/readings", response_model=SensorReadingAck)
async def ingest_sensor_reading(
    reading_in: SensorReadingCreate,
    db: Session = Depends(get_db)
):
    """
    Ingest a new sensor telemetry payload from physical ESP32 (or bench simulator).
    Pipeline:
    1. Store raw and calibrated sensor data in SQLite.
    2. Run modular baseline ML anomaly inference (Isolation Forest).
    3. Store ML prediction with model metadata.
    4. Evaluate rule-based and ML-based alert triggers.
    5. Update ESP32 hardware heartbeat and latency.
    6. Broadcast live update to React frontend over WebSocket.
    7. Return acknowledgement with ML score.
    """
    timestamp = reading_in.timestamp or datetime.utcnow()
    raw_payload_str = reading_in.model_dump_json()

    # 1. Store reading
    reading = SensorReading(
        timestamp=timestamp,
        device_id=reading_in.device_id,
        water_temperature=reading_in.water_temperature,
        ph=reading_in.ph,
        ph_raw_voltage=reading_in.ph_raw_voltage,
        air_temperature=reading_in.air_temperature,
        humidity=reading_in.humidity,
        water_level=reading_in.water_level,
        water_level_raw=reading_in.water_level_raw,
        float_status=reading_in.float_status,
        wifi_rssi=reading_in.wifi_rssi,
        uptime_seconds=reading_in.uptime_seconds,
        is_demo=reading_in.is_demo if reading_in.is_demo is not None else False,
        source=reading_in.source or "esp32_live",
        raw_payload=raw_payload_str
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)

    # 2. Run ML Anomaly Inference
    reading_dict = {
        "water_temperature": reading.water_temperature,
        "ph": reading.ph,
        "air_temperature": reading.air_temperature,
        "humidity": reading.humidity,
        "water_level": reading.water_level
    }
    ml_result = sensor_ml_engine.predict(reading_dict)

    ml_record = MLPrediction(
        timestamp=timestamp,
        model_name=ml_result["model_name"],
        model_version=ml_result["model_version"],
        prediction=ml_result["status"],
        confidence=0.95,
        anomaly_score=ml_result["anomaly_score"],
        input_features=str(ml_result["input_values"])
    )
    db.add(ml_record)
    db.commit()

    # 3. Evaluate Alerts
    new_alerts = alert_engine.evaluate_reading(db, reading_dict, ml_result)

    # 4. Update ESP32 Heartbeat
    esp_status = db.query(SystemStatus).filter(SystemStatus.component == "ESP32").first()
    if not esp_status:
        esp_status = SystemStatus(
            component="ESP32",
            status="ONLINE",
            last_heartbeat=datetime.utcnow(),
            details=f"Device {reading.device_id} ({reading.source})"
        )
        db.add(esp_status)
    else:
        esp_status.status = "ONLINE"
        esp_status.last_heartbeat = datetime.utcnow()
        esp_status.details = f"Device {reading.device_id} ({reading.source})"
    db.commit()

    # 5. Broadcast to connected WebSocket clients
    broadcast_data = {
        "id": reading.id,
        "timestamp": reading.timestamp.isoformat(),
        "device_id": reading.device_id,
        "water_temperature": reading.water_temperature,
        "ph": reading.ph,
        "ph_raw_voltage": reading.ph_raw_voltage,
        "air_temperature": reading.air_temperature,
        "humidity": reading.humidity,
        "water_level": reading.water_level,
        "water_level_raw": reading.water_level_raw,
        "float_status": reading.float_status,
        "wifi_rssi": reading.wifi_rssi,
        "uptime_seconds": reading.uptime_seconds,
        "is_demo": reading.is_demo,
        "source": reading.source,
        "ml_prediction": {
            "status": ml_result["status"],
            "anomaly_score": ml_result["anomaly_score"]
        }
    }
    await ws_manager.broadcast("sensor_reading", broadcast_data)

    if new_alerts:
        for alert in new_alerts:
            await ws_manager.broadcast("new_alert", {
                "id": alert.id,
                "severity": alert.severity,
                "source": alert.source,
                "parameter": alert.parameter,
                "message": alert.message,
                "value": alert.value,
                "timestamp": alert.timestamp.isoformat()
            })

    return SensorReadingAck(
        success=True,
        received_at=datetime.utcnow(),
        reading_id=reading.id,
        ml_status=ml_result["status"],
        anomaly_score=ml_result["anomaly_score"]
    )

@router.get("/latest", response_model=SensorReadingResponse)
def get_latest_reading(db: Session = Depends(get_db)):
    """Retrieve the most recent sensor reading from SQLite."""
    reading = db.query(SensorReading).order_by(desc(SensorReading.timestamp)).first()
    if not reading:
        raise HTTPException(status_code=404, detail="No sensor readings available yet.")
    return reading

@router.get("/history", response_model=List[SensorReadingResponse])
def get_sensor_history(
    range: str = Query("24h", description="Time window: 1h, 6h, 24h, 7d, or all"),
    limit: int = Query(500, le=2000),
    source: Optional[str] = Query(None, description="Filter by source: esp32_live, demo, or omit for all"),
    db: Session = Depends(get_db)
):
    """
    Retrieve historical sensor readings filtered by time range (1h, 6h, 24h, 7d).
    Sorted chronologically ascending for direct charting.
    """
    query = db.query(SensorReading)
    now = datetime.utcnow()

    if range == "1h":
        cutoff = now - timedelta(hours=1)
        query = query.filter(SensorReading.timestamp >= cutoff)
    elif range == "6h":
        cutoff = now - timedelta(hours=6)
        query = query.filter(SensorReading.timestamp >= cutoff)
    elif range == "24h":
        cutoff = now - timedelta(hours=24)
        query = query.filter(SensorReading.timestamp >= cutoff)
    elif range == "7d":
        cutoff = now - timedelta(days=7)
        query = query.filter(SensorReading.timestamp >= cutoff)
    
    if source:
        query = query.filter(SensorReading.source == source)

    readings = query.order_by(desc(SensorReading.timestamp)).limit(limit).all()
    readings.reverse()
    return readings
