import asyncio

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (registers models on Base before create_all)
from .api import (
    alerts,
    auth,
    events,
    findings,
    imports,
    incidents,
    scans,
    shifts,
    simulate,
    stats,
    users,
)
from .auth import require_auth
from .database import Base, engine
from .events import broadcaster
from . import sla

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SentriHub - Sizma Testi & SOC L1 Entegrasyon Araci")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _start_background_tasks():
    broadcaster.bind_loop(asyncio.get_running_loop())
    asyncio.create_task(sla.loop())


protected = [Depends(require_auth)]

app.include_router(auth.router)
app.include_router(imports.router, dependencies=protected)
app.include_router(findings.router, dependencies=protected)
app.include_router(alerts.router, dependencies=protected)
app.include_router(scans.router, dependencies=protected)
app.include_router(events.router, dependencies=protected)
app.include_router(stats.router, dependencies=protected)
app.include_router(shifts.router)
app.include_router(incidents.router, dependencies=protected)
app.include_router(users.router)
app.include_router(simulate.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
