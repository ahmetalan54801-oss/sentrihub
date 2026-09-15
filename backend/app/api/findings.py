from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/findings", tags=["findings"])


@router.get("", response_model=list[schemas.FindingOut])
def list_findings(
    severity: Optional[str] = None,
    host: Optional[str] = None,
    source_tool: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(models.Finding)
    if severity:
        query = query.filter(models.Finding.severity == severity)
    if host:
        query = query.filter(models.Finding.host == host)
    if source_tool:
        query = query.filter(models.Finding.source_tool == source_tool)
    if q:
        query = query.filter(models.Finding.title.ilike(f"%{q}%"))
    return query.order_by(models.Finding.last_seen.desc()).limit(limit).all()
