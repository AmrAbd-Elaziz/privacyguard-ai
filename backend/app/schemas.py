from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

Classification = Literal["Internal", "Confidential", "Restricted PII", "Sensitive PII", "Unknown"]
FollowUp = Literal["Ongoing", "Partial", "Completed", "Lifetime"]
Closure = Literal["Open", "In review", "Completed", "Lifetime"]

class AssetCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    asset_type: str = Field(min_length=2, max_length=100)
    owner: str = Field(min_length=2, max_length=150)
    business_purpose: str = Field(min_length=5, max_length=2000)
    environment: str = Field(min_length=2, max_length=100)
    data_location: str = Field(min_length=2, max_length=150)
    processors: list[str] = Field(default_factory=list)

class AssetRead(AssetCreate):
    id: int
    optional_attachment_path: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class WorkflowUpdate(BaseModel):
    remediation: FollowUp | None = None
    closure: Closure | None = None


class ReportCreate(BaseModel):
    report_type: str = Field(min_length=3, max_length=80)
    asset_id: int | None = None
    frameworks: list[str] = Field(default_factory=lambda: ["GDPR", "ISO/IEC 27001:2022"])
    include_workflow_status: bool = True


class AiGuidanceRequest(BaseModel):
    context_type: Literal["risk", "asset", "assessment", "control", "report"]
    context_id: str = Field(min_length=1, max_length=100)
    question: str = Field(min_length=5, max_length=2000)
