import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import correlation, models, schemas
from ..database import get_db
from ..parsers.nessus import parse_nessus
from ..parsers.nuclei import parse_nuclei
from ..parsers.openvas import parse_openvas

router = APIRouter(prefix="/api/imports", tags=["imports"])

PARSERS = {
    "nuclei": parse_nuclei,
    "openvas": parse_openvas,
    "nessus": parse_nessus,
}


@router.post("/{source_tool}", response_model=schemas.ImportResult)
async def import_report(
    source_tool: str, file: UploadFile = File(...), db: Session = Depends(get_db)
):
    parser = PARSERS.get(source_tool)
    if parser is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported source_tool '{source_tool}'. Use one of {list(PARSERS)}.",
        )

    content = await file.read()
    records = parser(content)

    batch = models.ImportBatch(source_tool=source_tool, filename=file.filename or "upload")
    db.add(batch)
    db.flush()

    alerts_created = 0
    alerts_updated = 0

    for rec in records:
        finding = models.Finding(
            import_batch_id=batch.id,
            source_tool=rec["source_tool"],
            host=rec["host"],
            port=rec.get("port"),
            protocol=rec.get("protocol"),
            title=rec["title"],
            description=rec.get("description"),
            severity=rec["severity"],
            cve=rec.get("cve"),
            cvss_score=rec.get("cvss_score"),
            signature="",
            raw_data=json.dumps(rec.get("raw_data"), default=str),
        )
        db.add(finding)
        db.flush()

        _, created = correlation.upsert_alert_for_finding(db, finding)
        if created:
            alerts_created += 1
        else:
            alerts_updated += 1

    batch.finding_count = len(records)
    db.commit()

    return schemas.ImportResult(
        import_batch_id=batch.id,
        source_tool=source_tool,
        findings_ingested=len(records),
        alerts_created=alerts_created,
        alerts_updated=alerts_updated,
    )
