"""
Plant Growth Monitoring Router (Manual Observations).
Handles manual plant data entry, date-to-date growth rate calculations,
morphology trends, and historical tracking without computer vision or cameras.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.orm_models import PlantObservation
from app.models.schemas import PlantObservationCreate, PlantObservationResponse
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/plants", tags=["Plants"])

@router.post("/observations", response_model=PlantObservationResponse)
async def create_plant_observation(
    obs_in: PlantObservationCreate,
    db: Session = Depends(get_db)
):
    """
    Record a manual plant growth and visual health observation.
    Automatically computes date-to-date height and leaf growth rates
    relative to the preceding observation of the same plant ID.
    """
    obs_time = obs_in.timestamp or datetime.utcnow()

    # Find previous observation for this plant to calculate growth rates
    prev_obs = db.query(PlantObservation).filter(
        PlantObservation.plant_id == obs_in.plant_id,
        PlantObservation.timestamp < obs_time
    ).order_by(desc(PlantObservation.timestamp)).first()

    growth_rate_cm_day = None
    leaf_growth_rate_day = None

    if prev_obs:
        days_diff = (obs_time - prev_obs.timestamp).total_seconds() / 86400.0
        if days_diff > 0.01:
            growth_rate_cm_day = round((obs_in.height_cm - prev_obs.height_cm) / days_diff, 2)
            leaf_growth_rate_day = round((obs_in.leaf_count - prev_obs.leaf_count) / days_diff, 2)

    new_obs = PlantObservation(
        timestamp=obs_time,
        plant_id=obs_in.plant_id,
        species_name=obs_in.species_name,
        height_cm=obs_in.height_cm,
        leaf_count=obs_in.leaf_count,
        canopy_width_cm=obs_in.canopy_width_cm,
        visual_health=obs_in.visual_health,
        chlorosis_observation=obs_in.chlorosis_observation,
        growth_rate_cm_day=growth_rate_cm_day,
        leaf_growth_rate_day=leaf_growth_rate_day,
        notes=obs_in.notes,
        observer_name=obs_in.observer_name
    )

    db.add(new_obs)
    db.commit()
    db.refresh(new_obs)

    # Broadcast update to connected frontend clients
    await ws_manager.broadcast("plant_update", {
        "id": new_obs.id,
        "plant_id": new_obs.plant_id,
        "species_name": new_obs.species_name,
        "height_cm": new_obs.height_cm,
        "leaf_count": new_obs.leaf_count,
        "canopy_width_cm": new_obs.canopy_width_cm,
        "visual_health": new_obs.visual_health,
        "chlorosis_observation": new_obs.chlorosis_observation,
        "growth_rate_cm_day": new_obs.growth_rate_cm_day,
        "leaf_growth_rate_day": new_obs.leaf_growth_rate_day,
        "timestamp": new_obs.timestamp.isoformat()
    })

    return new_obs

@router.get("/latest", response_model=PlantObservationResponse)
def get_latest_plant_observation(
    plant_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieve the most recent plant observation."""
    query = db.query(PlantObservation)
    if plant_id:
        query = query.filter(PlantObservation.plant_id == plant_id)
    obs = query.order_by(desc(PlantObservation.timestamp)).first()
    if not obs:
        raise HTTPException(status_code=404, detail="No plant observations recorded yet.")
    return obs

@router.get("/history", response_model=List[PlantObservationResponse])
def get_plant_history(
    plant_id: Optional[str] = Query(None, description="Filter by plant ID"),
    limit: int = Query(100),
    db: Session = Depends(get_db)
):
    """
    Retrieve historical plant growth observations sorted chronologically ascending.
    """
    query = db.query(PlantObservation)
    if plant_id:
        query = query.filter(PlantObservation.plant_id == plant_id)
    
    results = query.order_by(desc(PlantObservation.timestamp)).limit(limit).all()
    results.reverse()
    return results

@router.get("/summary")
def get_plants_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Retrieve aggregated overview across all tracked plants."""
    distinct_plants = db.query(PlantObservation.plant_id).distinct().all()
    plant_ids = [p[0] for p in distinct_plants]
    
    latest_by_plant = []
    for pid in plant_ids:
        latest = db.query(PlantObservation).filter(
            PlantObservation.plant_id == pid
        ).order_by(desc(PlantObservation.timestamp)).first()
        if latest:
            latest_by_plant.append({
                "plant_id": latest.plant_id,
                "species_name": latest.species_name,
                "height_cm": latest.height_cm,
                "leaf_count": latest.leaf_count,
                "canopy_width_cm": latest.canopy_width_cm,
                "visual_health": latest.visual_health,
                "chlorosis": latest.chlorosis_observation,
                "growth_rate_cm_day": latest.growth_rate_cm_day,
                "last_measured": latest.timestamp.isoformat()
            })

    return {
        "tracked_plants_count": len(plant_ids),
        "plant_ids": plant_ids,
        "plants": latest_by_plant
    }
