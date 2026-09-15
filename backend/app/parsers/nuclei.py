import json
from typing import Any

SEVERITY_MAP = {
    "critical": "critical",
    "high": "high",
    "medium": "medium",
    "low": "low",
    "info": "info",
    "informational": "info",
    "unknown": "info",
}


def parse_nuclei(content: bytes) -> list[dict[str, Any]]:
    """Parses nuclei -jsonl (one JSON object per line) or -json (array) output."""
    text = content.decode("utf-8", errors="replace").strip()
    if not text:
        return []

    records: list[dict[str, Any]] = []
    if text.startswith("["):
        try:
            records = json.loads(text)
        except json.JSONDecodeError:
            records = []
    else:
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    findings = []
    for rec in records:
        info = rec.get("info", {}) or {}
        classification = info.get("classification", {}) or {}
        cve_ids = classification.get("cve-id") or []
        if isinstance(cve_ids, str):
            cve_ids = [cve_ids]

        host = rec.get("host") or rec.get("ip") or "unknown"
        port = str(rec.get("port")) if rec.get("port") else None
        severity_raw = (info.get("severity") or "info").lower()

        findings.append(
            {
                "source_tool": "nuclei",
                "host": host,
                "port": port,
                "protocol": rec.get("type"),
                "title": info.get("name") or rec.get("template-id") or "Nuclei finding",
                "description": info.get("description"),
                "severity": SEVERITY_MAP.get(severity_raw, "info"),
                "cve": ",".join(cve_ids) if cve_ids else None,
                "cvss_score": classification.get("cvss-score"),
                "raw_data": rec,
            }
        )

    return findings
