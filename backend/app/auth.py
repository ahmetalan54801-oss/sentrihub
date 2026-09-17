import hashlib
import hmac
import os
import secrets
from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session

from . import models
from .database import SessionLocal

security = HTTPBasic()

PBKDF2_ITERATIONS = 100_000


@dataclass
class AuthedUser:
    username: str
    role: str


def hash_password(password: str, salt: Optional[bytes] = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return f"{salt.hex()}:{digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split(":")
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    expected = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return hmac.compare_digest(expected.hex(), digest_hex)


def _bootstrap_admin_if_empty(db: Session) -> None:
    """First boot (or a fresh DB): seed one admin from env vars so the
    existing SENTRIHUB_USERNAME/PASSWORD deployments keep working."""
    if db.query(models.User).count() > 0:
        return
    username = os.environ.get("SENTRIHUB_USERNAME", "admin")
    password = os.environ.get("SENTRIHUB_PASSWORD", "changeme")
    db.add(models.User(username=username, password_hash=hash_password(password), role="admin"))
    db.commit()


def require_auth(credentials: HTTPBasicCredentials = Depends(security)) -> AuthedUser:
    db = SessionLocal()
    try:
        _bootstrap_admin_if_empty(db)
        user = db.query(models.User).filter(models.User.username == credentials.username).first()
        if user is None or not verify_password(credentials.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Gecersiz kullanici adi veya sifre",
                headers={"WWW-Authenticate": "Basic"},
            )
        return AuthedUser(username=user.username, role=user.role)
    finally:
        db.close()


def require_admin(user: AuthedUser = Depends(require_auth)) -> AuthedUser:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu islem icin yonetici yetkisi gerekiyor",
        )
    return user
