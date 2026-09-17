from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from .. import models
from ..auth import AuthedUser, hash_password, require_admin
from ..database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])

VALID_ROLES = {"admin", "analyst"}


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: str


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "analyst"


class UserUpdate(BaseModel):
    password: Optional[str] = None
    role: Optional[str] = None


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), admin: AuthedUser = Depends(require_admin)):
    return db.query(models.User).order_by(models.User.username).all()


@router.post("", response_model=UserOut)
def create_user(
    payload: UserCreate, db: Session = Depends(get_db), admin: AuthedUser = Depends(require_admin)
):
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"role {sorted(VALID_ROLES)} olmali")
    if not payload.username.strip() or len(payload.password) < 4:
        raise HTTPException(
            status_code=400, detail="Kullanici adi bos olamaz, sifre en az 4 karakter olmali"
        )
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Bu kullanici adi zaten var")

    user = models.User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: AuthedUser = Depends(require_admin),
):
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Kullanici bulunamadi")

    if payload.role is not None:
        if payload.role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"role {sorted(VALID_ROLES)} olmali")
        user.role = payload.role
    if payload.password is not None:
        if len(payload.password) < 4:
            raise HTTPException(status_code=400, detail="Sifre en az 4 karakter olmali")
        user.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int, db: Session = Depends(get_db), admin: AuthedUser = Depends(require_admin)
):
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Kullanici bulunamadi")
    if user.username == admin.username:
        raise HTTPException(status_code=400, detail="Kendi hesabini silemezsin")
    db.delete(user)
    db.commit()
