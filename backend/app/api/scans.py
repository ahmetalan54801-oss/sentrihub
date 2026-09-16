import threading
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import SessionLocal, get_db
from ..events import broadcaster
from ..ingest import ingest_findings
from ..parsers.nuclei import parse_nuclei
from ..scanner import InvalidTarget, run_nuclei_scan, validate_target

router = APIRouter(prefix="/api/scans", tags=["scans"])


def _execute_scan(job_id: int, target: str) -> None:
    db = SessionLocal()
    try:
        job = db.get(models.ScanJob, job_id)
        try:
            content, stderr_tail = run_nuclei_scan(target)
            records = parse_nuclei(content)
            batch, alerts_created, alerts_updated = ingest_findings(
                db, "nuclei", f"scan:{target}", records
            )
            job.status = "completed"
            job.import_batch_id = batch.id
            job.findings_ingested = len(records)
            job.alerts_created = alerts_created
            job.alerts_updated = alerts_updated
            if not records and stderr_tail:
                job.error = stderr_tail
        except Exception as exc:  # noqa: BLE001 - surface any scan failure on the job row
            job.status = "failed"
            job.error = str(exc)
        job.completed_at = datetime.utcnow()
        db.commit()

        broadcaster.publish(
            {
                "type": "scan",
                "target": target,
                "status": job.status,
                "findings_ingested": job.findings_ingested,
            }
        )
    finally:
        db.close()


@router.post("", response_model=schemas.ScanJobOut)
def start_scan(payload: schemas.ScanCreate, db: Session = Depends(get_db)):
    try:
        target = validate_target(payload.target)
    except InvalidTarget as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    job = models.ScanJob(tool="nuclei", target=target, status="running")
    db.add(job)
    db.commit()
    db.refresh(job)

    threading.Thread(target=_execute_scan, args=(job.id, target), daemon=True).start()

    return job


@router.get("", response_model=list[schemas.ScanJobOut])
def list_scans(db: Session = Depends(get_db)):
    return db.query(models.ScanJob).order_by(models.ScanJob.created_at.desc()).limit(50).all()


@router.get("/{job_id}", response_model=schemas.ScanJobOut)
def get_scan(job_id: int, db: Session = Depends(get_db)):
    job = db.get(models.ScanJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Scan job not found")
    return job
