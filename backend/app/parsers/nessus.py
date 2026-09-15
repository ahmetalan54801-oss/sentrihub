import xml.etree.ElementTree as ET
from typing import Any, Optional

SEVERITY_MAP = {"0": "info", "1": "low", "2": "medium", "3": "high", "4": "critical"}


def _text(el: ET.Element, tag: str, default: Optional[str] = None) -> Optional[str]:
    child = el.find(tag)
    if child is not None and child.text:
        return child.text.strip()
    return default


def parse_nessus(content: bytes) -> list[dict[str, Any]]:
    """Parses a .nessus (NessusClientData_v2) XML scan export."""
    findings: list[dict[str, Any]] = []
    try:
        root = ET.fromstring(content)
    except ET.ParseError:
        return findings

    for report_host in root.iter("ReportHost"):
        host = report_host.get("name", "unknown")
        for item in report_host.findall("ReportItem"):
            severity = SEVERITY_MAP.get(item.get("severity", "0"), "info")

            cves = [c.text.strip() for c in item.findall("cve") if c.text]

            cvss_text = _text(item, "cvss_base_score") or _text(item, "cvss3_base_score")
            cvss = None
            if cvss_text:
                try:
                    cvss = float(cvss_text)
                except ValueError:
                    cvss = None

            findings.append(
                {
                    "source_tool": "nessus",
                    "host": host,
                    "port": item.get("port"),
                    "protocol": item.get("protocol"),
                    "title": item.get("pluginName", "Nessus finding"),
                    "description": _text(item, "description"),
                    "severity": severity,
                    "cve": ",".join(cves) if cves else None,
                    "cvss_score": cvss,
                    "raw_data": {
                        "pluginID": item.get("pluginID"),
                        "pluginName": item.get("pluginName"),
                        "port": item.get("port"),
                        "protocol": item.get("protocol"),
                        "severity": item.get("severity"),
                        "cve": cves,
                    },
                }
            )

    return findings
