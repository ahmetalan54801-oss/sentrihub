from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class FindingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_tool: str
    host: str
    port: Optional[str] = None
    protocol: Optional[str] = None
    title: str
    description: Optional[str] = None
    severity: str
    cve: Optional[str] = None
    cvss_score: Optional[float] = None
    first_seen: datetime
    last_seen: datetime


class AlertNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author: Optional[str] = None
    body: str
    created_at: datetime


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    host: str
    severity: str
    status: str
    assigned_to: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    findings: list[FindingOut] = []
    notes: list[AlertNoteOut] = []


class AlertUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None


class AlertNoteCreate(BaseModel):
    author: Optional[str] = None
    body: str


class ScanCreate(BaseModel):
    target: str


class ScanJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tool: str
    target: str
    status: str
    error: Optional[str] = None
    findings_ingested: Optional[int] = None
    alerts_created: Optional[int] = None
    alerts_updated: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class ImportResult(BaseModel):
    import_batch_id: int
    source_tool: str
    findings_ingested: int
    alerts_created: int
    alerts_updated: int


class SummaryOut(BaseModel):
    total_findings: int
    total_alerts: int
    open_alerts: int
    severity_breakdown: dict[str, int]
    alert_status_breakdown: dict[str, int]
