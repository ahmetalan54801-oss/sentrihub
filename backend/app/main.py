from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (registers models on Base before create_all)
from .api import alerts, auth, findings, imports, scans, stats
from .auth import require_auth
from .database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SentriHub - Sizma Testi & SOC L1 Entegrasyon Araci")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

protected = [Depends(require_auth)]

app.include_router(auth.router)
app.include_router(imports.router, dependencies=protected)
app.include_router(findings.router, dependencies=protected)
app.include_router(alerts.router, dependencies=protected)
app.include_router(scans.router, dependencies=protected)
app.include_router(stats.router, dependencies=protected)


@app.get("/api/health")
def health():
    return {"status": "ok"}
