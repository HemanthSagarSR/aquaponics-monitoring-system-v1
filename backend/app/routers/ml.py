"""
Machine Learning Router for Aquaponics Monitoring System V1.
Provides model diagnostic status and on-demand inference predictions.
Labels Isolation Forest baseline as prototype/baseline pending empirical data.
"""

from typing import Dict, Any
from fastapi import APIRouter
from app.ml.sensor_anomaly import sensor_ml_engine
from app.models.schemas import MLInferenceRequest, MLPredictionResponse
from app.config import settings

router = APIRouter(prefix="/ml", tags=["Machine Learning"])

@router.get("/status")
def get_ml_status() -> Dict[str, Any]:
    """
    Retrieve status, version, training dataset information, and feature list for ML models.
    Explicitly declares model as a prototype baseline without unsupported accuracy claims.
    """
    if not sensor_ml_engine.is_loaded:
        sensor_ml_engine.load_model()

    return {
        "status": "RUNNING" if sensor_ml_engine.is_loaded else "FAILED",
        "active_models": [
            {
                "model_name": sensor_ml_engine.metadata.get("model_name", "IsolationForest_Aquaponics_Baseline"),
                "version": sensor_ml_engine.metadata.get("model_version", "1.0.0-prototype"),
                "algorithm": sensor_ml_engine.metadata.get("algorithm", "IsolationForest"),
                "model_role": "Prototype Baseline",
                "validation_status": sensor_ml_engine.metadata.get(
                    "validation_status",
                    "Prototype baseline pending physical sensor calibration. Not validated on real deployment dataset."
                ),
                "accuracy_claim": sensor_ml_engine.metadata.get(
                    "accuracy_claim",
                    "Unsupported until real hardware deployment benchmark."
                ),
                "features": sensor_ml_engine.features,
                "anomaly_threshold": settings.SENSOR_ANOMALY_THRESHOLD,
                "memory_resident": sensor_ml_engine.is_loaded
            }
        ]
    }

@router.post("/predict", response_model=MLPredictionResponse)
def run_ml_prediction(req: MLInferenceRequest):
    """Execute on-demand modular ML anomaly inference on specified sensor parameters."""
    reading_dict = {
        "water_temperature": req.water_temperature,
        "ph": req.ph,
        "air_temperature": req.air_temperature,
        "humidity": req.humidity,
        "water_level": req.water_level
    }
    result = sensor_ml_engine.predict(reading_dict)
    return result
