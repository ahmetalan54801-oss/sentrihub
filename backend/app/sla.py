import asyncio
import os
from datetime import datetime, timedelta, timezone

from . import models
from .database import SessionLocal
from .events import broadcaster

SLA_MINUTES = int(os.environ.get("SENTRIHUB_SLA_MINUTES", "30"))
CHECK_INTERVAL_SECONDS = 60
ACTIVE_STATUSES = ("new", "in_progress")


def _check_once() -> None:
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(minutes=SLA_MINUTES)
        stale = (
            db.query(models.Alert)
            .filter(models.Alert.status.in_(ACTIVE_STATUSES))
            .filter(models.Alert.updated_at < cutoff)
            .all()
        )
        for alert in stale:
            alert.status = "escalated"
            alert.updated_at = datetime.utcnow()
            db.add(
                models.AlertNote(
                    alert_id=alert.id,
                    author="sistem",
                    body=f"SLA suresi asildi ({SLA_MINUTES} dakika), otomatik olarak eskalasyona alindi.",
                )
            )
            db.commit()

            broadcaster.publish(
                {
                    "type": "escalation",
                    "source": "sla",
                    "host": alert.host,
                    "title": f"SLA asimi: {alert.title}",
                    "severity": alert.severity,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
    finally:
        db.close()


async def loop() -> None:
    while True:
        try:
            _check_once()
        except Exception:  # noqa: BLE001 - a single bad check must not kill the loop
            pass
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
