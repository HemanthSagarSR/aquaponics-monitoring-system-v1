"""
SQLAlchemy ORM models for Aquaponics Monitoring System V1.
Strictly decoupled from Raspberry Pi and computer vision.
Supports physical ESP32 telemetry, manual plant observations, alerts, and baseline ML predictions.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, Text, Boolean
from app.database import Base

class SensorReading(Base):
    """
    Stores sensor telemetry payloads from physical ESP32 or demo feed.
    Preserves both raw values/voltages and calibrated measurements for research integrity.
    """
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    device_id = Column(String(50), index=True, default="ESP32_AQUA_01")
    
    # Core physical sensors
    water_temperature = Column(Float, nullable=False)        # DS18B20 (°C)
    ph = Column(Float, nullable=False)                       # Calibrated pH (0.0 - 14.0)
    ph_raw_voltage = Column(Float, nullable=True)            # Measured voltage at GPIO 34 (V)
    air_temperature = Column(Float, nullable=False)          # DHT11 (°C)
    humidity = Column(Float, nullable=False)                 # DHT11 (% RH)
    water_level = Column(Float, nullable=False)              # Calibrated water level (%)
    water_level_raw = Column(Integer, nullable=True)         # Raw ADC reading from GPIO 35 (0 - 4095)
    float_status = Column(String(20), nullable=False, default="SAFE") # P31 float switch: SAFE or ALERT

    # Telemetry metadata
    wifi_rssi = Column(Integer, nullable=True)               # Signal strength (dBm)
    uptime_seconds = Column(Integer, nullable=True)          # ESP32 uptime in seconds
    is_demo = Column(Boolean, default=False, index=True)     # True if synthetic/demo; False for real ESP32
    source = Column(String(50), default="esp32_live")        # "esp32_live" or "demo"
    raw_payload = Column(Text, nullable=True)                # Preserved JSON payload string

class PlantObservation(Base):
    """
    Stores manual plant growth and health observations recorded by the research team.
    Computer vision and cameras are NOT used; all data is manually inspected and entered.
    """
    __tablename__ = "plant_observations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    plant_id = Column(String(50), default="BED-A-01", index=True)
    species_name = Column(String(100), default="Lactuca sativa (Butterhead Lettuce)")
    
    # Manual physical measurements
    height_cm = Column(Float, nullable=False)                # Physical measured height (cm)
    leaf_count = Column(Integer, nullable=False)             # Count of true leaves
    canopy_width_cm = Column(Float, nullable=False)          # Maximum horizontal diameter (cm)
    
    # Visual assessments
    visual_health = Column(String(50), default="HEALTHY")    # HEALTHY, VIGOROUS, STUNTED, WILTING, PEST_DAMAGE
    chlorosis_observation = Column(String(50), default="NONE") # NONE, MILD, MODERATE, SEVERE
    
    # Computed date-to-date dynamics
    growth_rate_cm_day = Column(Float, nullable=True)        # Height delta per day vs previous record
    leaf_growth_rate_day = Column(Float, nullable=True)      # Leaf count delta per day vs previous record
    
    # Documentation
    notes = Column(Text, nullable=True)
    observer_name = Column(String(100), nullable=True)

class FishObservation(Base):
    """
    Stores manual observations of fish health and feeding behavior (optional experiment log).
    Manual inspection only; no automated computer vision.
    """
    __tablename__ = "fish_observations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    fish_count = Column(Integer, default=20)
    feeding_response = Column(String(50), default="NORMAL")  # AGGRESSIVE, NORMAL, SLOW, NONE
    mortality_count = Column(Integer, default=0)
    behaviour_notes = Column(Text, nullable=True)
    observer_name = Column(String(100), nullable=True)

class MLPrediction(Base):
    """
    Stores output of modular machine learning anomaly detection inferences with full model provenance.
    """
    __tablename__ = "ml_predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    model_name = Column(String(100), index=True)
    model_version = Column(String(50))
    prediction = Column(String(50))                          # NORMAL, SENSOR_ANOMALY, UNUSUAL_PATTERN, etc.
    confidence = Column(Float, default=1.0)
    anomaly_score = Column(Float, default=0.0)               # Scaled 0.0 to 1.0
    input_features = Column(Text, nullable=True)

class Alert(Base):
    """
    Stores system alerts from rule-based thresholds, ML anomaly detection, or watchdog events.
    """
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    severity = Column(String(20), default="WARNING")          # INFO, WARNING, CRITICAL
    source = Column(String(50), default="RULE")               # RULE, ML_ISOLATION_FOREST, WATCHDOG
    parameter = Column(String(50), index=True)                # water_temperature, ph, water_level, float_switch, esp32_offline, etc.
    message = Column(String(255))
    value = Column(String(100), nullable=True)
    status = Column(String(20), default="ACTIVE")             # ACTIVE, ACKNOWLEDGED, RESOLVED
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

class SystemStatus(Base):
    """
    Heartbeat and connectivity status for system components.
    """
    __tablename__ = "system_status"

    id = Column(Integer, primary_key=True, index=True)
    component = Column(String(50), unique=True, index=True)
    status = Column(String(20), default="ONLINE")             # ONLINE, OFFLINE, DEGRADED
    last_heartbeat = Column(DateTime, default=datetime.utcnow)
    details = Column(String(255), nullable=True)
