"""
Optional Manual Fish Observations Router.
Allows logging manual fish health observations, feeding behavior,
and mortality tracking for the aquaponics fish tank.
Strictly manual data entry without cameras or automated computer vision.
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.orm_models import FishObservation
from app.models.schemas import FishObservationCreate, FishObservationResponse
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/fish", tags=["Fish (Manual Observations)"])

@router.post("/observations", response_model=FishObservationResponse)
async def create_fish_observation(
    obs_in: FishObservationCreate,
    db: Session = Depends(get_db)
):
    """Log a manual fish feeding behavior and health observation."""
    obs_time = obs_in.timestamp or datetime.utcnow()
    new_obs = FishObservation(
        timestamp=obs_time,
        fish_count=obs_in.fish_count,
        feeding_response=obs_in.feeding_response,
        mortality_count=obs_in.mortality_count,
        behaviour_notes=obs_in.behaviour_notes,
        observer_name=obs_in.observer_name
    )
    db.add(new_obs)
    db.commit()
    db.refresh(new_obs)

    await ws_manager.broadcast("fish_update", {
        "id": new_obs.id,
        "fish_count": new_obs.fish_count,
        "feeding_response": new_obs.feeding_response,
        "mortality_count": new_obs.mortality_count,
        "behaviour_notes": new_obs.behaviour_notes,
        "timestamp": new_obs.timestamp.isoformat()
    })

    return new_obs

@router.get("/latest", response_model=FishObservationResponse)
def get_latest_fish_observation(db: Session = Depends(get_db)):
    """Retrieve the most recent manual fish health record."""
    obs = db.query(FishObservation).order_by(desc(FishObservation.timestamp)).first()
    if not obs:
        raise HTTPException(status_code=404, detail="No fish observations recorded yet.")
    return obs

@router.get("/history", response_model=List[FishObservationResponse])
def get_fish_history(
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    """Retrieve manual fish observation history sorted chronologically ascending."""
    results = db.query(FishObservation).order_by(desc(FishObservation.timestamp)).limit(limit).all()
    results.reverse()
    return results
