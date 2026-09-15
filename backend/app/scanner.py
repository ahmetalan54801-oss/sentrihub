import re
import shutil
import subprocess
import tempfile
from pathlib import Path

TARGET_PATTERN = re.compile(
    r"^(https?://)?[A-Za-z0-9.-]+(:[0-9]{1,5})?(/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?$"
)


class InvalidTarget(ValueError):
    pass


def validate_target(target: str) -> str:
    target = target.strip()
    if not target or len(target) > 300 or not TARGET_PATTERN.match(target):
        raise InvalidTarget(
            "Gecersiz hedef. http(s):// ile baslayan bir URL veya host[:port] bekleniyor "
            "(bosluk, ;, |, & gibi karakterler icermemeli)."
        )
    return target


def nuclei_available() -> bool:
    return shutil.which("nuclei") is not None


def run_nuclei_scan(target: str, timeout: int = 300) -> tuple[bytes, str]:
    """Runs nuclei against `target`. Returns (jsonl output bytes, stderr tail)."""
    target = validate_target(target)
    if not nuclei_available():
        raise RuntimeError("nuclei bulunamadi. VM'de 'sudo apt install -y nuclei' ile kurun.")

    with tempfile.TemporaryDirectory() as tmp:
        out_path = Path(tmp) / "scan.jsonl"
        result = subprocess.run(
            ["nuclei", "-u", target, "-jsonl", "-o", str(out_path), "-silent"],
            timeout=timeout,
            capture_output=True,
            check=False,
        )
        output = out_path.read_bytes() if out_path.exists() else b""
        stderr_tail = result.stderr.decode("utf-8", errors="replace")[-2000:] if result.stderr else ""
        return output, stderr_tail
