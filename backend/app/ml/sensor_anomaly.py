"""
Sensor Anomaly Detection Engine.
Uses modular scikit-learn Isolation Forest model loaded into memory on startup.

DISCLAIMER:
This model is a PROTOTYPE BASELINE. It provides proof-of-concept anomaly scoring
for multi-sensor telemetry (water temp, pH, air temp, humidity, water level)
and must be retrained/calibrated against physical hardware logs before production use.
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np
import joblib
from app.config import settings

class SensorAnomalyModel:
    def __init__(self):
        self.model = None
        self.metadata = {}
        self.model_path = settings.MODELS_DIR / "sensor_anomaly_model.joblib"
        self.metadata_path = settings.MODELS_DIR / "metadata.json"
        self.features = ["water_temperature", "ph", "air_temperature", "humidity", "water_level"]
        self.is_loaded = False

    def load_model(self):
        """Loads pretrained baseline model and metadata from disk, or triggers baseline creation."""
        if self.model_path.exists() and self.metadata_path.exists():
            try:
                self.model = joblib.load(self.model_path)
                with open(self.metadata_path, "r") as f:
                    self.metadata = json.load(f)
                self.is_loaded = True
                print(f"[ML Engine] Loaded {self.metadata.get('model_name')} v{self.metadata.get('model_version')} into memory.")
                return True
            except Exception as e:
                print(f"[ML Engine] Error loading model from {self.model_path}: {e}")
        
        # If model doesn't exist yet, train baseline and load
        print("[ML Engine] Pretrained model not found. Generating baseline prototype model...")
        from app.ml.train_baseline import train_and_export_baseline
        train_and_export_baseline()
        
        if self.model_path.exists() and self.metadata_path.exists():
            self.model = joblib.load(self.model_path)
            with open(self.metadata_path, "r") as f:
                self.metadata = json.load(f)
            self.is_loaded = True
            return True
        return False

    def predict(self, reading: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs inference on a single sensor acquisition tuple.
        Returns normalized anomaly score (0.0 to 1.0) and scientific categorization.
        """
        if not self.is_loaded or self.model is None:
            self.load_model()

        # Extract features with fallback defaults
        x_input = [
            float(reading.get("water_temperature", 24.0)),
            float(reading.get("ph", 7.0)),
            float(reading.get("air_temperature", 25.0)),
            float(reading.get("humidity", 65.0)),
            float(reading.get("water_level", 80.0)),
        ]
        
        X = np.array([x_input])
        
        # Isolation Forest decision_function: lower means more abnormal
        raw_score = float(self.model.decision_function(X)[0])
        raw_pred = int(self.model.predict(X)[0])  # +1 for inlier, -1 for outlier

        # Transform raw score into calibrated 0.0 (safely normal) to 1.0 (extreme anomaly)
        # Using a logistic sigmoid transform on decision_function
        normalized_anomaly_score = float(1.0 / (1.0 + np.exp(raw_score * 12.0)))
        normalized_anomaly_score = round(max(0.0, min(1.0, normalized_anomaly_score)), 3)

        # Categorize output without unproven diagnostic claims
        if normalized_anomaly_score >= 0.75:
            status = "SENSOR_ANOMALY" if (x_input[1] < 4.5 or x_input[1] > 9.5 or x_input[0] > 40.0) else "ENVIRONMENTAL_ANOMALY"
        elif normalized_anomaly_score >= 0.55:
            status = "UNUSUAL_PATTERN"
        elif normalized_anomaly_score >= 0.40:
            status = "REQUIRES_OBSERVATION"
        else:
            status = "NORMAL"

        return {
            "status": status,
            "anomaly_score": normalized_anomaly_score,
            "raw_score": round(raw_score, 4),
            "is_outlier": bool(raw_pred == -1),
            "model_name": self.metadata.get("model_name", "IsolationForest_Aquaponics_Baseline"),
            "model_version": self.metadata.get("model_version", "1.0.0-prototype"),
            "validation_status": self.metadata.get("validation_status", "Prototype baseline pending physical sensor logs."),
            "features_used": self.features,
            "input_values": {k: v for k, v in zip(self.features, x_input)}
        }

# Global singleton model instance loaded at server startup
sensor_ml_engine = SensorAnomalyModel()
