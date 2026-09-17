import asyncio
import random
from datetime import datetime, timezone

from .database import SessionLocal
from .events import broadcaster
from .ingest import ingest_findings

INTERNAL_HOSTS = [f"10.0.0.{i}" for i in range(2, 60)]
EXTERNAL_HOSTS = [f"203.0.113.{i}" for i in range(1, 30)] + [f"198.51.100.{i}" for i in range(1, 30)]
COMMON_PORTS = [80, 443, 22, 53, 3389, 8080, 445, 21, 25]

SUSPICIOUS_TITLES = [
    "Anormal veri hacmi tespit edildi",
    "Bilinmeyen porta baglanti denemesi",
    "Sik tekrar eden baglanti denemesi (port scan supheli)",
    "Beklenmeyen disa dogru baglanti",
]

_task: asyncio.Task | None = None
_running = False


def _random_flow() -> dict:
    src = random.choice(INTERNAL_HOSTS)
    dst = random.choice(EXTERNAL_HOSTS + INTERNAL_HOSTS)
    port = random.choice(COMMON_PORTS)
    protocol = random.choice(["tcp", "udp"])
    size = random.randint(200, 500_000)
    suspicious = random.random() < 0.15

    if suspicious:
        severity = random.choice(["medium", "high", "critical"])
        title = random.choice(SUSPICIOUS_TITLES)
    else:
        severity = "info"
        title = f"{protocol.upper()} akisi: {src} -> {dst}:{port}"

    return {
        "host": f"{src} -> {dst}",
        "title": title,
        "severity": severity,
        "description": f"{size} bayt, port {port}/{protocol}",
    }


async def _loop() -> None:
    global _running
    while _running:
        flow = _random_flow()
        db = SessionLocal()
        try:
            record = {
                "source_tool": "network",
                "host": flow["host"],
                "port": None,
                "protocol": None,
                "title": flow["title"],
                "description": flow["description"],
                "severity": flow["severity"],
                "cve": None,
                "cvss_score": None,
                "raw_data": flow,
            }
            ingest_findings(db, "network", "network-sim", [record])
            db.commit()
        finally:
            db.close()

        broadcaster.publish(
            {
                "type": "live_event",
                "source": "network",
                "host": flow["host"],
                "title": flow["title"],
                "severity": flow["severity"],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        await asyncio.sleep(random.uniform(2, 4))


def is_running() -> bool:
    return _running


def start() -> None:
    global _running, _task
    if _running:
        return
    _running = True
    _task = asyncio.create_task(_loop())


def stop() -> None:
    global _running
    _running = False
