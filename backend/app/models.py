from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import relationship

from .database import Base

finding_alert_link = Table(
    "finding_alert_link",
    Base.metadata,
    Column("finding_id", Integer, ForeignKey("findings.id"), primary_key=True),
    Column("alert_id", Integer, ForeignKey("alerts.id"), primary_key=True),
)


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True)
    source_tool = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    imported_at = Column(DateTime, default=datetime.utcnow)
    finding_count = Column(Integer, default=0)

    findings = relationship("Finding", back_populates="import_batch")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True)
    import_batch_id = Column(Integer, ForeignKey("import_batches.id"))
    source_tool = Column(String, nullable=False)
    host = Column(String, nullable=False, index=True)
    port = Column(String, nullable=True)
    protocol = Column(String, nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String, nullable=False, index=True)
    cve = Column(String, nullable=True, index=True)
    cvss_score = Column(Float, nullable=True)
    signature = Column(String, nullable=False, index=True)
    raw_data = Column(Text, nullable=True)
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)

    import_batch = relationship("ImportBatch", back_populates="findings")
    alerts = relationship("Alert", secondary=finding_alert_link, back_populates="findings")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    host = Column(String, nullable=False, index=True)
    severity = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="new", index=True)
    assigned_to = Column(String, nullable=True)
    signature = Column(String, nullable=False, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    findings = relationship("Finding", secondary=finding_alert_link, back_populates="alerts")
    notes = relationship("AlertNote", back_populates="alert", cascade="all, delete-orphan")


class AlertNote(Base):
    __tablename__ = "alert_notes"

    id = Column(Integer, primary_key=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=False)
    author = Column(String, nullable=True)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    alert = relationship("Alert", back_populates="notes")
