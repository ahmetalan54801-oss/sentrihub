from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/summary", response_model=schemas.SummaryOut)
def summary(db: Session = Depends(get_db)):
    total_findings = db.query(models.Finding).count()
    total_alerts = db.query(models.Alert).count()
    open_alerts = (
        db.query(models.Alert)
        .filter(models.Alert.status.notin_(["closed", "false_positive"]))
        .count()
    )

    severity_breakdown = dict(
        db.query(models.Finding.severity, func.count(models.Finding.id))
        .group_by(models.Finding.severity)
        .all()
    )
    alert_status_breakdown = dict(
        db.query(models.Alert.status, func.count(models.Alert.id))
        .group_by(models.Alert.status)
        .all()
    )

    return schemas.SummaryOut(
        total_findings=total_findings,
        total_alerts=total_alerts,
        open_alerts=open_alerts,
        severity_breakdown=severity_breakdown,
        alert_status_breakdown=alert_status_breakdown,
    )
