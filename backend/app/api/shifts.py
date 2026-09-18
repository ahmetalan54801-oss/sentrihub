from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import AuthedUser, require_admin, require_auth
from ..database import get_db

router = APIRouter(prefix="/api/shifts", tags=["shifts"])

DEFAULT_SHIFTS = [
    ("Sabah", "08:00", "16:00"),
    ("Aksam", "16:00", "00:00"),
    ("Gece", "00:00", "08:00"),
]


def _bootstrap_shifts(db: Session) -> None:
    if db.query(models.Shift).count() > 0:
        return
    for name, start, end in DEFAULT_SHIFTS:
        db.add(models.Shift(name=name, start_time=start, end_time=end, username=None))
    try:
        db.commit()
    except Exception:  # noqa: BLE001 - lost the race to another concurrent bootstrap
        db.rollback()


def _in_window(now_hm: str, start: str, end: str) -> bool:
    if start <= end:
        return start <= now_hm < end
    return now_hm >= start or now_hm < end  # wraps past midnight


@router.get("", response_model=list[schemas.ShiftOut])
def list_shifts(db: Session = Depends(get_db), user: AuthedUser = Depends(require_auth)):
    _bootstrap_shifts(db)
    return db.query(models.Shift).order_by(models.Shift.start_time).all()


@router.get("/oncall")
def oncall(db: Session = Depends(get_db), user: AuthedUser = Depends(require_auth)):
    _bootstrap_shifts(db)
    now_hm = datetime.utcnow().strftime("%H:%M")
    for shift in db.query(models.Shift).all():
        if _in_window(now_hm, shift.start_time, shift.end_time):
            return {"shift": shift.name, "username": shift.username}
    return {"shift": None, "username": None}


@router.patch("/{shift_id}", response_model=schemas.ShiftOut)
def update_shift(
    shift_id: int,
    payload: schemas.ShiftUpdate,
    db: Session = Depends(get_db),
    admin: AuthedUser = Depends(require_admin),
):
    shift = db.get(models.Shift, shift_id)
    if shift is None:
        raise HTTPException(status_code=404, detail="Vardiya bulunamadi")
    shift.username = payload.username
    db.commit()
    db.refresh(shift)
    return shift
