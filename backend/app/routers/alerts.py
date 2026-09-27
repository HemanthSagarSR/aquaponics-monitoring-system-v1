"""
Alerts Router for Aquaponics Monitoring System V1.
Lists active/historical rule-based, watchdog, and ML-based alerts,
and supports acknowledgement and resolution workflows.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.orm_models import Alert
from app.models.schemas import AlertResponse
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, ACKNOWLEDGED, RESOLVED"),
    severity: Optional[str] = Query(None, description="Filter by severity: INFO, WARNING, CRITICAL"),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    """Retrieve system alerts ordered by newest first."""
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
    return query.order_by(desc(Alert.timestamp)).limit(limit).all()

@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    """Mark an active alert as ACKNOWLEDGED."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    
    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)

    await ws_manager.broadcast("alert_updated", {
        "id": alert.id,
        "status": alert.status,
        "acknowledged_at": alert.acknowledged_at.isoformat()
    })

    return alert

@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    """Mark an alert as RESOLVED."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    
    alert.status = "RESOLVED"
    alert.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)

    await ws_manager.broadcast("alert_updated", {
        "id": alert.id,
        "status": alert.status,
        "resolved_at": alert.resolved_at.isoformat()
    })

    return alert

@router.post("/acknowledge-all")
async def acknowledge_all_alerts(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Bulk acknowledge all currently ACTIVE alerts."""
    now = datetime.utcnow()
    active_alerts = db.query(Alert).filter(Alert.status == "ACTIVE").all()
    count = len(active_alerts)
    for a in active_alerts:
        a.status = "ACKNOWLEDGED"
        a.acknowledged_at = now
    db.commit()

    await ws_manager.broadcast("alerts_bulk_acknowledged", {"count": count, "timestamp": now.isoformat()})
    return {"success": True, "acknowledged_count": count}
