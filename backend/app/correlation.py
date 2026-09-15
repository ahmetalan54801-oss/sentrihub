from datetime import datetime

from sqlalchemy.orm import Session

from . import models

SEVERITY_ORDER = ["info", "low", "medium", "high", "critical"]


def _severity_rank(sev: str) -> int:
    try:
        return SEVERITY_ORDER.index(sev)
    except ValueError:
        return 0


def build_signature(host: str, cve: str | None, title: str) -> str:
    key = cve.split(",")[0].strip() if cve else title.strip().lower()
    return f"{host.strip().lower()}::{key}"


def upsert_alert_for_finding(db: Session, finding: models.Finding) -> tuple[models.Alert, bool]:
    """Attach a finding to the open alert sharing its host+CVE (or host+title)
    signature, or create a new alert. Returns (alert, created)."""
    signature = build_signature(finding.host, finding.cve, finding.title)
    finding.signature = signature

    alert = db.query(models.Alert).filter(models.Alert.signature == signature).first()

    created = False
    if alert is None:
        alert = models.Alert(
            title=finding.title,
            host=finding.host,
            severity=finding.severity,
            status="new",
            signature=signature,
        )
        db.add(alert)
        created = True
    else:
        if _severity_rank(finding.severity) > _severity_rank(alert.severity):
            alert.severity = finding.severity
        if alert.status == "closed":
            # A previously closed issue reappearing in a new scan needs re-review.
            alert.status = "new"
        alert.updated_at = datetime.utcnow()

    alert.findings.append(finding)
    return alert, created
