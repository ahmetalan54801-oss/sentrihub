from fastapi import APIRouter, Depends

from ..auth import require_auth

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/whoami")
def whoami(username: str = Depends(require_auth)):
    return {"username": username}
