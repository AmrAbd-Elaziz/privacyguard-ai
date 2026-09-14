from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

def utc_now():
    return datetime.now(timezone.utc)

class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    asset_type: Mapped[str] = mapped_column(String(100))
    owner: Mapped[str] = mapped_column(String(150))
    business_purpose: Mapped[str] = mapped_column(Text)
    environment: Mapped[str] = mapped_column(String(100))
    data_location: Mapped[str] = mapped_column(String(150))
    processors: Mapped[list] = mapped_column(JSON, default=list)
    optional_attachment_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    assessments = relationship("Assessment", back_populates="asset", cascade="all, delete-orphan")
    risks = relationship("Risk", back_populates="asset", cascade="all, delete-orphan")

class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    source_type: Mapped[str] = mapped_column(String(50), default="file_upload")
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    detected_categories: Mapped[list] = mapped_column(JSON, default=list)
    classification: Mapped[str] = mapped_column(String(50), default="Unknown")
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    risk_level: Mapped[str] = mapped_column(String(30), default="Low")
    mapped_control_ids: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    asset = relationship("Asset", back_populates="assessments")
    risks = relationship("Risk", back_populates="assessment", cascade="all, delete-orphan")
    workflow = relationship("Workflow", back_populates="assessment", uselist=False, cascade="all, delete-orphan")

class Risk(Base):
    __tablename__ = "risks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    risk_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("assessments.id"), index=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), index=True)
    title: Mapped[str] = mapped_column(String(250))
    rationale: Mapped[str] = mapped_column(Text)
    classification: Mapped[str] = mapped_column(String(50))
    likelihood: Mapped[str] = mapped_column(String(20))
    impact: Mapped[str] = mapped_column(String(20))
    inherent_score: Mapped[int] = mapped_column(Integer)
    mapped_control_ids: Mapped[list] = mapped_column(JSON, default=list)
    owner: Mapped[str] = mapped_column(String(150))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    asset = relationship("Asset", back_populates="risks")
    assessment = relationship("Assessment", back_populates="risks")

class Workflow(Base):
    __tablename__ = "workflows"
    __table_args__ = (UniqueConstraint("assessment_id", name="uq_workflow_assessment"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), index=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("assessments.id"), index=True)
    remediation: Mapped[str] = mapped_column(String(30), default="Ongoing")
    remediation_status: Mapped[str] = mapped_column(String(30), default="Ongoing")
    closure: Mapped[str] = mapped_column(String(30), default="Open")
    closure_status: Mapped[str] = mapped_column(String(30), default="Open")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    assessment = relationship("Assessment", back_populates="workflow")

class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(250))
    report_type: Mapped[str] = mapped_column(String(80))
    asset_id: Mapped[int | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    frameworks: Mapped[list] = mapped_column(JSON, default=list)
    include_workflow_status: Mapped[bool] = mapped_column(default=True)
    status: Mapped[str] = mapped_column(String(30), default="Ready")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
