import json

from sqlalchemy.orm import Session

from . import correlation, models


def ingest_findings(
    db: Session, source_tool: str, filename: str, records: list[dict]
) -> tuple[models.ImportBatch, int, int]:
    """Persists normalized finding dicts and correlates them into alerts.
    Returns (import_batch, alerts_created, alerts_updated). Caller must commit."""
    batch = models.ImportBatch(source_tool=source_tool, filename=filename)
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
    return batch, alerts_created, alerts_updated
