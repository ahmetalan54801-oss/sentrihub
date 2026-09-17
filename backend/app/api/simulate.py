from fastapi import APIRouter, Depends

from .. import netsim
from ..auth import AuthedUser, require_admin, require_auth

router = APIRouter(prefix="/api/simulate", tags=["simulate"])


@router.get("/status")
async def status(user: AuthedUser = Depends(require_auth)):
    return {"running": netsim.is_running()}


@router.post("/start")
async def start(admin: AuthedUser = Depends(require_admin)):
    netsim.start()
    return {"running": True}


@router.post("/stop")
async def stop(admin: AuthedUser = Depends(require_admin)):
    netsim.stop()
    return {"running": False}
