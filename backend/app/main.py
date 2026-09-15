from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (registers models on Base before create_all)
from .api import alerts, findings, imports, scans, stats
from .database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SentriHub - Sizma Testi & SOC L1 Entegrasyon Araci")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(imports.router)
app.include_router(findings.router)
app.include_router(alerts.router)
app.include_router(scans.router)
app.include_router(stats.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
