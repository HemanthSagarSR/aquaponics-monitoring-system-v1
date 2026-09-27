"""
Application configuration for Aquaponics Monitoring System (V1).
Loads environment variables and sets safe local defaults.
"""

from pathlib import Path
import os

try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseModel as BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Aquaponics Monitoring System V1"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment mode: "live" (physical ESP32) or "demo" (simulated sensor feed)
    APP_MODE: str = os.getenv("APP_MODE", "demo")
    
    # Paths
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = BASE_DIR / "data"
    MODELS_DIR: Path = BASE_DIR / "data" / "models"
    
    # SQLite Database URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'data' / 'aquaponics.db'}")
    
    # Sensor thresholds for Rule-based Alerts
    # Water Temperature (°C)
    TEMP_MIN_CRITICAL: float = 18.0
    TEMP_MIN_WARNING: float = 21.0
    TEMP_MAX_WARNING: float = 28.0
    TEMP_MAX_CRITICAL: float = 32.0
    
    # pH Levels
    PH_MIN_CRITICAL: float = 5.8
    PH_MIN_WARNING: float = 6.4
    PH_MAX_WARNING: float = 7.6
    PH_MAX_CRITICAL: float = 8.2
    
    # Water Level (%)
    WATER_LEVEL_MIN_CRITICAL: float = 25.0
    WATER_LEVEL_MIN_WARNING: float = 40.0
    WATER_LEVEL_MAX_WARNING: float = 90.0
    WATER_LEVEL_MAX_CRITICAL: float = 96.0

    # Air Temperature (°C) & Humidity (%)
    AIR_TEMP_MAX_WARNING: float = 35.0
    HUMIDITY_MIN_WARNING: float = 35.0
    HUMIDITY_MAX_WARNING: float = 85.0
    
    # ESP32 Watchdog (seconds before declaring offline)
    ESP32_OFFLINE_TIMEOUT_SECONDS: float = 60.0

    # ML Anomaly Threshold
    SENSOR_ANOMALY_THRESHOLD: float = 0.65

settings = Settings()

# Ensure runtime storage directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
