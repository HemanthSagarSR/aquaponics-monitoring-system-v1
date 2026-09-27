"""
Analytics Router for Aquaponics Research V1.
Computes multi-domain cross-correlations:
- Physical water parameters <-> Manual plant growth rate (cm/day)
- Environmental parameters <-> Leaf production
- Air temperature <-> Water temperature coupling
Provides scatter datasets, Pearson correlation coefficients, and research caveats.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List
import numpy as np
from scipy import stats
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.orm_models import SensorReading, PlantObservation

router = APIRouter(prefix="/analytics", tags=["Analytics"])

def calculate_correlation(x: List[float], y: List[float]) -> Dict[str, Any]:
    """Helper to compute Pearson r and p-value safely."""
    if len(x) < 3 or len(y) < 3:
        return {"r": 0.0, "p_value": 1.0, "sample_count": len(x)}
    
    min_len = min(len(x), len(y))
    x_arr = np.array(x[:min_len])
    y_arr = np.array(y[:min_len])

    if np.std(x_arr) == 0 or np.std(y_arr) == 0:
        return {"r": 0.0, "p_value": 1.0, "sample_count": min_len}

    r, p = stats.pearsonr(x_arr, y_arr)
    return {
        "r": round(float(r), 3) if not np.isnan(r) else 0.0,
        "p_value": round(float(p), 4) if not np.isnan(p) else 1.0,
        "sample_count": min_len
    }

@router.get("")
def get_analytics_correlations(
    days: int = Query(14, ge=1, le=90),
    db: Session = Depends(get_db)
):
    """
    Computes cross-domain correlations between physical sensor parameters and manual plant growth.
    Returns scatter plot pairs, regression statistics, and scientific caveat disclaimer.
    """
    cutoff = datetime.utcnow() - timedelta(days=days)

    readings = db.query(SensorReading).filter(
        SensorReading.timestamp >= cutoff
    ).order_by(SensorReading.timestamp.asc()).all()

    plant_obs = db.query(PlantObservation).filter(
        PlantObservation.timestamp >= cutoff
    ).order_by(PlantObservation.timestamp.asc()).all()

    # 1. Match sensor parameters to plant observations (closest sensor reading within 6 hours)
    temp_vs_plant_scatter = []
    ph_vs_plant_scatter = []
    hum_vs_plant_scatter = []

    for p in plant_obs:
        if p.growth_rate_cm_day is None:
            continue
        # Find closest sensor reading
        matched = min(readings, key=lambda s: abs((s.timestamp - p.timestamp).total_seconds()), default=None)
        if matched and abs((matched.timestamp - p.timestamp).total_seconds()) <= 21600:
            temp_vs_plant_scatter.append({
                "x": matched.water_temperature,
                "y": p.growth_rate_cm_day,
                "plant_id": p.plant_id,
                "timestamp": p.timestamp.isoformat()
            })
            ph_vs_plant_scatter.append({
                "x": matched.ph,
                "y": p.growth_rate_cm_day,
                "plant_id": p.plant_id,
                "timestamp": p.timestamp.isoformat()
            })
            hum_vs_plant_scatter.append({
                "x": matched.humidity,
                "y": p.growth_rate_cm_day,
                "plant_id": p.plant_id,
                "timestamp": p.timestamp.isoformat()
            })

    # 2. Environmental coupling: Air temp vs Water temp
    air_vs_water_scatter = []
    # Sample every Nth reading to keep scatter responsive
    stride = max(1, len(readings) // 100)
    for s in readings[::stride]:
        air_vs_water_scatter.append({
            "x": s.air_temperature,
            "y": s.water_temperature,
            "timestamp": s.timestamp.isoformat()
        })

    # Compute correlation statistics
    temp_plant_stat = calculate_correlation(
        [p["x"] for p in temp_vs_plant_scatter],
        [p["y"] for p in temp_vs_plant_scatter]
    )
    ph_plant_stat = calculate_correlation(
        [p["x"] for p in ph_vs_plant_scatter],
        [p["y"] for p in ph_vs_plant_scatter]
    )
    hum_plant_stat = calculate_correlation(
        [p["x"] for p in hum_vs_plant_scatter],
        [p["y"] for p in hum_vs_plant_scatter]
    )
    air_water_stat = calculate_correlation(
        [p["x"] for p in air_vs_water_scatter],
        [p["y"] for p in air_vs_water_scatter]
    )

    return {
        "analysis_period_days": days,
        "scientific_disclaimer": "Observed correlations reflect environmental and manual observation co-variance in the current closed-loop aquaponics system. Correlation does not imply direct biological causation.",
        "correlations": {
            "water_temp_vs_plant_growth": {
                "title": "Water Temperature vs. Plant Height Growth Rate",
                "x_label": "Water Temperature (°C)",
                "y_label": "Growth Rate (cm/day)",
                "correlation": temp_plant_stat,
                "scatter_data": temp_vs_plant_scatter[:100]
            },
            "ph_vs_plant_growth": {
                "title": "Water pH vs. Plant Height Growth Rate",
                "x_label": "pH",
                "y_label": "Growth Rate (cm/day)",
                "correlation": ph_plant_stat,
                "scatter_data": ph_vs_plant_scatter[:100]
            },
            "humidity_vs_plant_growth": {
                "title": "Air Humidity vs. Plant Height Growth Rate",
                "x_label": "Relative Humidity (%)",
                "y_label": "Growth Rate (cm/day)",
                "correlation": hum_plant_stat,
                "scatter_data": hum_vs_plant_scatter[:100]
            },
            "air_temp_vs_water_temp": {
                "title": "Air Temperature vs. Water Temperature Coupling",
                "x_label": "Air Temperature (°C)",
                "y_label": "Water Temperature (°C)",
                "correlation": air_water_stat,
                "scatter_data": air_vs_water_scatter[:100]
            }
        }
    }
