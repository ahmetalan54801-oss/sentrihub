from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import schemas
from ..database import get_db
from ..events import broadcaster
from ..ingest import ingest_findings
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

    batch, alerts_created, alerts_updated = ingest_findings(
        db, source_tool, file.filename or "upload", records
    )
    db.commit()

    broadcaster.publish(
        {
            "type": "import",
            "source": source_tool,
            "findings_ingested": len(records),
            "alerts_created": alerts_created,
        }
    )

    return schemas.ImportResult(
        import_batch_id=batch.id,
        source_tool=source_tool,
        findings_ingested=len(records),
        alerts_created=alerts_created,
        alerts_updated=alerts_updated,
    )
