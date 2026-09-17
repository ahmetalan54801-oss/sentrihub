import asyncio
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import schemas
from ..auth import require_auth
from ..database import get_db
from ..events import broadcaster
from ..ingest import ingest_findings

router = APIRouter(prefix="/api/events", tags=["events"])

VALID_SEVERITIES = {"info", "low", "medium", "high", "critical"}


class EventIn(BaseModel):
    source: str = "siem"
    host: str
    title: str
    description: Optional[str] = None
    severity: str = "medium"
    cve: Optional[str] = None


@router.post("", response_model=schemas.ImportResult)
def ingest_event(
    payload: EventIn, db: Session = Depends(get_db), username: str = Depends(require_auth)
):
    """Generic push endpoint for external SIEM/syslog/IDS sources. Each call
    is normalized into a Finding and correlated into an Alert exactly like a
    file import, then broadcast to any connected live-monitor clients."""
    severity = payload.severity.lower()
    if severity not in VALID_SEVERITIES:
        raise HTTPException(400, f"severity {sorted(VALID_SEVERITIES)} olmali")

    record = {
        "source_tool": payload.source,
        "host": payload.host,
        "port": None,
        "protocol": None,
        "title": payload.title,
        "description": payload.description,
        "severity": severity,
        "cve": payload.cve,
        "cvss_score": None,
        "raw_data": payload.model_dump(),
    }

    batch, alerts_created, alerts_updated = ingest_findings(
        db, payload.source, f"live:{payload.source}", [record]
    )
    db.commit()

    broadcaster.publish(
        {
            "type": "live_event",
            "source": payload.source,
            "host": payload.host,
            "title": payload.title,
            "severity": severity,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    return schemas.ImportResult(
        import_batch_id=batch.id,
        source_tool=payload.source,
        findings_ingested=1,
        alerts_created=alerts_created,
        alerts_updated=alerts_updated,
    )


async def _event_generator(queue: asyncio.Queue):
    try:
        while True:
            payload = await queue.get()
            yield f"data: {payload}\n\n"
    except asyncio.CancelledError:
        raise


@router.get("/stream")
async def stream_events(username: str = Depends(require_auth)):
    queue = broadcaster.subscribe()

    async def wrapped():
        try:
            yield "data: {\"type\": \"connected\"}\n\n"
            async for chunk in _event_generator(queue):
                yield chunk
        finally:
            broadcaster.unsubscribe(queue)

    return StreamingResponse(
        wrapped(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
