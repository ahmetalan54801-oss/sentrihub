import os
import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

security = HTTPBasic()


def require_auth(credentials: HTTPBasicCredentials = Depends(security)) -> str:
    correct_username = os.environ.get("SENTRIHUB_USERNAME", "admin")
    correct_password = os.environ.get("SENTRIHUB_PASSWORD", "changeme")

    username_ok = secrets.compare_digest(credentials.username, correct_username)
    password_ok = secrets.compare_digest(credentials.password, correct_password)

    if not (username_ok and password_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Gecersiz kullanici adi veya sifre",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username
