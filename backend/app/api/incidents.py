from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import AuthedUser, require_auth
from ..database import get_db

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.get("", response_model=list[schemas.IncidentReportOut])
def list_incidents(db: Session = Depends(get_db), user: AuthedUser = Depends(require_auth)):
    return (
        db.query(models.IncidentReport)
        .order_by(models.IncidentReport.created_at.desc())
        .limit(200)
        .all()
    )


@router.get("/by-alert/{alert_id}", response_model=list[schemas.IncidentReportOut])
def list_incidents_for_alert(
    alert_id: int, db: Session = Depends(get_db), user: AuthedUser = Depends(require_auth)
):
    return (
        db.query(models.IncidentReport)
        .filter(models.IncidentReport.alert_id == alert_id)
        .order_by(models.IncidentReport.created_at.desc())
        .all()
    )


@router.post("/{alert_id}", response_model=schemas.IncidentReportOut)
def create_incident(
    alert_id: int,
    payload: schemas.IncidentReportCreate,
    db: Session = Depends(get_db),
    user: AuthedUser = Depends(require_auth),
):
    alert = db.get(models.Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert bulunamadi")

    report = models.IncidentReport(
        alert_id=alert_id,
        title=payload.title,
        summary=payload.summary,
        root_cause=payload.root_cause,
        actions_taken=payload.actions_taken,
        resolution=payload.resolution,
        recommendations=payload.recommendations,
        author=payload.author or user.username,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
