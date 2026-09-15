import xml.etree.ElementTree as ET
from typing import Any, Optional

THREAT_MAP = {
    "critical": "critical",
    "high": "high",
    "medium": "medium",
    "low": "low",
    "log": "info",
    "debug": "info",
}


def _text(el: ET.Element, tag: str, default: Optional[str] = None) -> Optional[str]:
    child = el.find(tag)
    if child is not None and child.text:
        return child.text.strip()
    return default


def parse_openvas(content: bytes) -> list[dict[str, Any]]:
    """Parses an OpenVAS/Greenbone XML report (<report><results><result>...)."""
    findings: list[dict[str, Any]] = []
    try:
        root = ET.fromstring(content)
    except ET.ParseError:
        return findings

    for result in root.iter("result"):
        name = _text(result, "name", "OpenVAS finding")
        host = _text(result, "host", "unknown")
        port = _text(result, "port")
        threat = (_text(result, "threat", "Log") or "log").lower()
        description = _text(result, "description")

        nvt = result.find("nvt")
        cve = None
        cvss = None
        if nvt is not None:
            cve = _text(nvt, "cve")
            if cve in (None, "NOCVE"):
                cve = None
            cvss_text = _text(nvt, "cvss_base")
            if cvss_text:
                try:
                    cvss = float(cvss_text)
                except ValueError:
                    cvss = None
            if not description:
                description = _text(nvt, "description")

        findings.append(
            {
                "source_tool": "openvas",
                "host": host,
                "port": port,
                "protocol": None,
                "title": name,
                "description": description,
                "severity": THREAT_MAP.get(threat, "info"),
                "cve": cve,
                "cvss_score": cvss,
                "raw_data": {
                    "name": name,
                    "host": host,
                    "port": port,
                    "threat": threat,
                    "cve": cve,
                    "cvss_base": cvss,
                },
            }
        )

    return findings
