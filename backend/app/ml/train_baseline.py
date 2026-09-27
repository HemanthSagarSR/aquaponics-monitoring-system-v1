"""
Offline baseline training script for Aquaponics Sensor Anomaly Model.
Generates baseline synthetic distribution of normal operations and exports
trained IsolationForest model and metadata.json.

CRITICAL RESEARCH NOTICE:
This Isolation Forest model is an initial prototype/baseline intended to demonstrate
modular anomaly detection integration. It has NOT been validated on empirical physical
telemetry from the deployed hardware. Model predictions must be treated as indicative
until bench calibrations and field data are collected.
"""

import json
from pathlib import Path
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
from app.config import settings

def generate_baseline_dataset(n_samples: int = 6000, random_seed: int = 42):
    """
    Synthesizes normal operating parameter bounds based on biological aquaponics literature:
    - Water Temp: 22.0 - 27.0 °C (DS18B20 target)
    - pH: 6.6 - 7.4 (calibrated analog probe)
    - Air Temp: 20.0 - 28.0 °C (DHT11 ambient)
    - Humidity: 55.0 - 75.0 % (DHT11 ambient)
    - Water Level: 75.0 - 95.0 % (water-level sensor)
    """
    np.random.seed(random_seed)
    
    water_temp = np.random.normal(loc=24.5, scale=1.4, size=n_samples)
    ph = np.random.normal(loc=6.95, scale=0.22, size=n_samples)
    air_temp = np.random.normal(loc=24.0, scale=2.2, size=n_samples)
    humidity = np.random.normal(loc=65.0, scale=5.5, size=n_samples)
    water_level = np.random.normal(loc=85.0, scale=4.0, size=n_samples)
    
    # Clip to realistic physical bounds
    water_temp = np.clip(water_temp, 18.0, 31.0)
    ph = np.clip(ph, 6.2, 7.8)
    air_temp = np.clip(air_temp, 16.0, 33.0)
    humidity = np.clip(humidity, 40.0, 90.0)
    water_level = np.clip(water_level, 60.0, 99.0)

    X = np.column_stack([water_temp, ph, air_temp, humidity, water_level])
    return X

def train_and_export_baseline():
    """Trains IsolationForest baseline and saves model + metadata to settings.MODELS_DIR."""
    settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    
    X_train = generate_baseline_dataset(n_samples=6000)
    
    model = IsolationForest(
        n_estimators=100,
        contamination=0.04,  # Estimated baseline noise/outlier rate
        random_state=42,
        max_samples="auto",
        n_jobs=-1
    )
    model.fit(X_train)
    
    model_file = settings.MODELS_DIR / "sensor_anomaly_model.joblib"
    metadata_file = settings.MODELS_DIR / "metadata.json"
    
    joblib.dump(model, model_file)
    
    metadata = {
        "model_name": "IsolationForest_Aquaponics_Baseline",
        "model_version": "1.0.0-prototype",
        "algorithm": "IsolationForest",
        "model_role": "Prototype Baseline",
        "validation_status": "Prototype / baseline model. Requires validation and tuning against empirical ESP32 sensor logs before production reliance.",
        "accuracy_claim": "Unsupported until real hardware deployment benchmark.",
        "training_dataset_info": "Baseline synthetic normal aquaponics distribution (6,000 samples calibrated to typical aquaponics bounds)",
        "features": [
            "water_temperature",
            "ph",
            "air_temperature",
            "humidity",
            "water_level"
        ],
        "preprocessing_requirements": "Raw numeric floating point values (Celsius, pH units, %, %); bounded scaling via logistic transform on decision function",
        "expected_input_format": {
            "water_temperature": "float (°C)",
            "ph": "float (0.0-14.0)",
            "air_temperature": "float (°C)",
            "humidity": "float (%RH)",
            "water_level": "float (%)"
        },
        "created_at": "2026-09-27T00:00:00Z"
    }
    
    with open(metadata_file, "w") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"[Training] Baseline model successfully exported to {model_file}")
    print(f"[Training] Metadata exported to {metadata_file}")

if __name__ == "__main__":
    train_and_export_baseline()
