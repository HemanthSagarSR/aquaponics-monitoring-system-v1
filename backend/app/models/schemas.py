"""
Pydantic schemas for request validation and response serialization.
Strictly tailored for V1: physical sensors, manual plant growth tracking, and baseline ML.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# ==========================================
# Sensor Reading Schemas
# ==========================================
class SensorReadingCreate(BaseModel):
    device_id: str = Field(default="ESP32_AQUA_01", description="Identifier of the acquiring ESP32 node")
    timestamp: Optional[datetime] = Field(default=None, description="Acquisition timestamp")
    
    # Core sensors
    water_temperature: float = Field(..., description="Water temperature from DS18B20 (°C)")
    ph: float = Field(..., ge=0.0, le=14.0, description="Calibrated pH reading (0.0 to 14.0)")
    ph_raw_voltage: Optional[float] = Field(default=None, description="Raw analog voltage at ADC pin (V)")
    air_temperature: float = Field(..., description="Ambient air temperature from DHT11 (°C)")
    humidity: float = Field(..., ge=0.0, le=100.0, description="Ambient relative humidity from DHT11 (%)")
    water_level: float = Field(..., ge=0.0, le=100.0, description="Calibrated water level percentage (0 to 100%)")
    water_level_raw: Optional[int] = Field(default=None, ge=0, le=4095, description="Raw ADC count from GPIO 35 (0-4095)")
    float_status: str = Field(default="SAFE", description="P31 float switch status: SAFE or ALERT")
    
    # Metadata
    wifi_rssi: Optional[int] = Field(default=None, description="Wi-Fi signal strength in dBm")
    uptime_seconds: Optional[int] = Field(default=None, description="ESP32 uptime in seconds")
    is_demo: Optional[bool] = Field(default=False, description="Flag indicating simulated demo telemetry")
    source: Optional[str] = Field(default="esp32_live", description="Source identifier: 'esp32_live' or 'demo'")

class SensorReadingResponse(SensorReadingCreate):
    id: int
    timestamp: datetime
    raw_payload: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class SensorReadingAck(BaseModel):
    success: bool
    received_at: datetime
    reading_id: int
    ml_status: str
    anomaly_score: float

# ==========================================
# Manual Plant Observation Schemas
# ==========================================
class PlantObservationCreate(BaseModel):
    plant_id: str = Field(default="BED-A-01", description="Identifier of plant or grow-bed channel")
    species_name: str = Field(default="Lactuca sativa (Butterhead Lettuce)", description="Plant botanical or common name")
    timestamp: Optional[datetime] = Field(default=None, description="Manual observation timestamp")
    height_cm: float = Field(..., gt=0.0, description="Manual plant height in centimeters")
    leaf_count: int = Field(..., ge=0, description="Manual count of healthy true leaves")
    canopy_width_cm: float = Field(..., gt=0.0, description="Manual canopy spread/diameter in centimeters")
    visual_health: str = Field(default="HEALTHY", description="Visual rating: HEALTHY, VIGOROUS, STUNTED, WILTING, PEST_DAMAGE")
    chlorosis_observation: str = Field(default="NONE", description="Yellowing/chlorosis: NONE, MILD, MODERATE, SEVERE")
    notes: Optional[str] = Field(default=None, description="Freeform observation and root notes")
    observer_name: Optional[str] = Field(default=None, description="Name of student or researcher recording data")

class PlantObservationResponse(PlantObservationCreate):
    id: int
    timestamp: datetime
    growth_rate_cm_day: Optional[float] = None
    leaf_growth_rate_day: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# Optional Manual Fish Observation Schemas
# ==========================================
class FishObservationCreate(BaseModel):
    timestamp: Optional[datetime] = Field(default=None, description="Observation timestamp")
    fish_count: int = Field(default=20, ge=0, description="Estimated or verified population count")
    feeding_response: str = Field(default="NORMAL", description="Feeding response: AGGRESSIVE, NORMAL, SLOW, NONE")
    mortality_count: int = Field(default=0, ge=0, description="Any observed mortality")
    behaviour_notes: Optional[str] = Field(default=None, description="Behavioral notes: swimming pattern, surface piping, etc.")
    observer_name: Optional[str] = Field(default=None, description="Name of observer")

class FishObservationResponse(FishObservationCreate):
    id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# Alert Schemas
# ==========================================
class AlertResponse(BaseModel):
    id: int
    timestamp: datetime
    severity: str
    source: str
    parameter: str
    message: str
    value: Optional[str] = None
    status: str
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# ML Schemas
# ==========================================
class MLInferenceRequest(BaseModel):
    water_temperature: float = Field(..., description="Water temperature (°C)")
    ph: float = Field(..., description="pH level (0-14)")
    air_temperature: float = Field(..., description="Air temperature (°C)")
    humidity: float = Field(..., description="Air humidity (%)")
    water_level: float = Field(..., description="Water level (%)")

class MLPredictionResponse(BaseModel):
    status: str
    anomaly_score: float
    raw_score: float
    is_outlier: bool
    model_name: str
    model_version: str
    validation_status: str
    features_used: List[str]
    input_values: Dict[str, float]

# ==========================================
# System Status Schemas
# ==========================================
class ComponentStatus(BaseModel):
    name: str
    status: str
    last_heartbeat: Optional[datetime] = None
    latency_seconds: Optional[float] = None
    details: Optional[str] = None

class SystemStatusResponse(BaseModel):
    app_mode: str
    overall_status: str
    components: Dict[str, ComponentStatus]
    last_sensor_update_seconds_ago: Optional[float] = None
    total_readings_stored: int
    active_alerts_count: int
    critical_alerts_count: int
    timestamp: datetime

class AppModeToggleRequest(BaseModel):
    mode: str = Field(..., pattern="^(live|demo)$")
