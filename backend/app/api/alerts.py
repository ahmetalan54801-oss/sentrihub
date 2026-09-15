from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

VALID_STATUSES = {"new", "in_progress", "escalated", "closed", "false_positive"}


@router.get("", response_model=list[schemas.AlertOut])
def list_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(models.Alert)
    if status:
        query = query.filter(models.Alert.status == status)
    if severity:
        query = query.filter(models.Alert.severity == severity)
    return query.order_by(models.Alert.updated_at.desc()).limit(limit).all()


@router.get("/{alert_id}", response_model=schemas.AlertOut)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.get(models.Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.patch("/{alert_id}", response_model=schemas.AlertOut)
def update_alert(alert_id: int, payload: schemas.AlertUpdate, db: Session = Depends(get_db)):
    alert = db.get(models.Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    if payload.status is not None:
        if payload.status not in VALID_STATUSES:
            raise HTTPException(
                status_code=400, detail=f"status must be one of {sorted(VALID_STATUSES)}"
            )
        alert.status = payload.status
    if payload.assigned_to is not None:
        alert.assigned_to = payload.assigned_to

    alert.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return alert


@router.post("/{alert_id}/notes", response_model=schemas.AlertOut)
def add_note(alert_id: int, payload: schemas.AlertNoteCreate, db: Session = Depends(get_db)):
    alert = db.get(models.Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    note = models.AlertNote(alert_id=alert.id, author=payload.author, body=payload.body)
    db.add(note)
    alert.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return alert
