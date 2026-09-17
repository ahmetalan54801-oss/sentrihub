from fastapi import APIRouter, Depends

from ..auth import AuthedUser, require_auth

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/whoami")
def whoami(user: AuthedUser = Depends(require_auth)):
    return {"username": user.username, "role": user.role}
