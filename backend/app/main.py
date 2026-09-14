from contextlib import asynccontextmanager
import re
import json
import os
from pathlib import Path
from uuid import uuid4
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .advisor import ask_local_ollama
from .analysis import analyze_text, extract_text
from .catalog import CONTROL_CATALOG
from .reporting import build_snapshot, render_pdf
from .db import Base, engine, get_db
from .models import Asset, Assessment, Report, Risk, Workflow
from .schemas import AiGuidanceRequest, AssetCreate, AssetRead, ReportCreate, WorkflowUpdate

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="PrivacyGuard AI Enterprise API",
    version="1.0.0",
    lifespan=lifespan,
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:5174",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "privacyguard-ai-enterprise-api"}

@app.get("/api/overview")
def overview(db: Session = Depends(get_db)):
    assets = db.scalar(select(func.count()).select_from(Asset)) or 0
    assessments = db.scalar(select(func.count()).select_from(Assessment)) or 0
    risks = db.scalar(select(func.count()).select_from(Risk)) or 0
    high_risks = db.scalar(
        select(func.count()).select_from(Risk).where(Risk.inherent_score >= 16)
    ) or 0
    classifications = {key: 0 for key in ["Internal", "Confidential", "Restricted PII", "Sensitive PII", "Unknown"]}
    for value, count in db.execute(
        select(Assessment.classification, func.count()).group_by(Assessment.classification)
    ):
        if value in classifications:
            classifications[value] = count
    # Real Risk -> Control mapping metrics.
    risk_control_lists = db.scalars(select(Risk.mapped_control_ids)).all()

    total_control_mappings = sum(
        len(control_ids or [])
        for control_ids in risk_control_lists
    )

    unique_mapped_control_ids = {
        control_id
        for control_ids in risk_control_lists
        for control_id in (control_ids or [])
    }

    return {
        "linked_assets": assets,
        "assessments": assessments,
        "calculated_risks": risks,
        "high_priority_risks": high_risks,

        # Total Risk -> Control relationships across all calculated risks.
        "mapped_controls": total_control_mappings,

        # Unique controls actually referenced by risks.
        "unique_controls": len(unique_mapped_control_ids),

        # Full available control catalog.
        "control_catalog_size": len(CONTROL_CATALOG),

        "classification_distribution": classifications,
    }

@app.get("/api/assets", response_model=list[AssetRead])
def list_assets(db: Session = Depends(get_db)):
    return db.scalars(select(Asset).order_by(Asset.updated_at.desc())).all()

@app.post("/api/assets", response_model=AssetRead, status_code=201)
def create_asset(payload: AssetCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(Asset).where(Asset.name == payload.name))
    if existing:
        raise HTTPException(status_code=409, detail="An asset with this name already exists")
    asset = Asset(**payload.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@app.post("/api/assets/intake", response_model=AssetRead, status_code=201)
async def intake_asset(
    name: str = Form(""),
    asset_type: str = Form(""),
    owner: str = Form(""),
    business_purpose: str = Form(""),
    environment: str = Form(""),
    data_location: str = Form(""),
    processors: str = Form(""),
    attachment: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
):
    def profile_values(text: str) -> dict:
        mapping = {
            "asset name": "name", "name": "name",
            "asset type": "asset_type",
            "business owner": "owner", "owner": "owner",
            "business purpose": "business_purpose", "purpose": "business_purpose",
            "environment": "environment",
            "data location": "data_location", "location": "data_location",
            "third parties / processors": "processors",
            "third parties": "processors", "processors": "processors",
        }
        values = {}
        for line in text.splitlines():
            parts = [p.strip() for p in re.split(r"\s*\|\s*|\s*:\s*", line) if p.strip()]
            if len(parts) >= 2:
                field = mapping.get(parts[0].lower())
                if field:
                    values[field] = " ".join(parts[1:]).strip()
        return values

    file_bytes = None
    suffix = None
    profile = {}

    if attachment and attachment.filename:
        suffix = Path(attachment.filename).suffix.lower()
        if suffix not in {".xlsx", ".docx", ".pdf"}:
            raise HTTPException(status_code=415, detail="Asset Profile supports XLSX, DOCX, or PDF only")

        file_bytes = await attachment.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="The Asset Profile file is empty")
        if len(file_bytes) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Maximum upload size is 10 MB")

        preview_dir = UPLOAD_DIR / "asset-profile-preview"
        preview_dir.mkdir(parents=True, exist_ok=True)
        preview = preview_dir / f"{uuid4().hex}{suffix}"
        preview.write_bytes(file_bytes)
        try:
            profile = profile_values(extract_text(preview, suffix))
        finally:
            preview.unlink(missing_ok=True)

    final_name = name.strip() or profile.get("name", "")
    final_purpose = business_purpose.strip() or profile.get("business_purpose", "")
    final_location = data_location.strip() or profile.get("data_location", "")
    final_type = asset_type.strip() or profile.get("asset_type", "Application")
    final_owner = owner.strip() or profile.get("owner", "Data Engineering")
    final_environment = environment.strip() or profile.get("environment", "Cloud application")
    final_processors = processors.strip() or profile.get("processors", "")

    if not final_name or not final_purpose or not final_location:
        raise HTTPException(
            status_code=422,
            detail="Complete the manual form, or upload an Asset Profile containing Asset name, Business purpose, and Data location.",
        )

    if db.scalar(select(Asset).where(Asset.name == final_name)):
        raise HTTPException(status_code=409, detail="An asset with this name already exists")

    stored_path = None
    if file_bytes and suffix:
        asset_dir = UPLOAD_DIR / "assets"
        asset_dir.mkdir(parents=True, exist_ok=True)
        stored_path = asset_dir / f"{uuid4().hex}{suffix}"
        stored_path.write_bytes(file_bytes)

    asset = Asset(
        name=final_name,
        asset_type=final_type,
        owner=final_owner,
        business_purpose=final_purpose,
        environment=final_environment,
        data_location=final_location,
        processors=[item.strip() for item in final_processors.split(",") if item.strip()],
        optional_attachment_path=str(stored_path) if stored_path else None,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@app.get("/api/assessments")
def list_assessments(db: Session = Depends(get_db)):
    items = db.scalars(select(Assessment).order_by(Assessment.updated_at.desc())).all()
    return [{
        "id": item.id, "name": item.name, "asset_id": item.asset_id,
        "source_type": item.source_type, "file_name": item.file_name,
        "detected_categories": item.detected_categories,
        "classification": item.classification, "risk_score": item.risk_score,
        "risk_level": item.risk_level, "mapped_control_ids": item.mapped_control_ids,
        "created_at": item.created_at, "updated_at": item.updated_at,
    } for item in items]

@app.get("/api/risks")
def list_risks(db: Session = Depends(get_db)):
    items = db.scalars(select(Risk).order_by(Risk.inherent_score.desc())).all()
    return [{
        "id": item.id, "risk_code": item.risk_code, "title": item.title,
        "asset_id": item.asset_id, "assessment_id": item.assessment_id,
        "classification": item.classification, "likelihood": item.likelihood,
        "impact": item.impact, "inherent_score": item.inherent_score,
        "rationale": item.rationale, "owner": item.owner,
        "mapped_control_ids": item.mapped_control_ids,
    } for item in items]

@app.get("/api/workflows")
def list_workflows(db: Session = Depends(get_db)):
    items = db.scalars(select(Workflow).order_by(Workflow.updated_at.desc())).all()
    return [{
        "id": item.id, "asset_id": item.asset_id, "assessment_id": item.assessment_id,
        "remediation": item.remediation, "remediation_status": item.remediation_status,
        "closure": item.closure, "closure_status": item.closure_status,
        "updated_at": item.updated_at,
    } for item in items]

@app.put("/api/workflows/{workflow_id}")
def update_workflow(workflow_id: int, payload: WorkflowUpdate, db: Session = Depends(get_db)):
    workflow = db.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if payload.remediation is not None:
        workflow.remediation = payload.remediation
        workflow.remediation_status = payload.remediation
    if payload.closure is not None:
        workflow.closure = payload.closure
        workflow.closure_status = payload.closure
    db.commit()
    db.refresh(workflow)
    return {
        "id": workflow.id, "remediation": workflow.remediation,
        "remediation_status": workflow.remediation_status,
        "closure": workflow.closure, "closure_status": workflow.closure_status,
        "updated_at": workflow.updated_at,
    }

@app.get("/api/controls")
def list_controls():
    return CONTROL_CATALOG

@app.get("/api/controls/{control_id}")
def get_control(control_id: str):
    control = next((item for item in CONTROL_CATALOG if item["id"] == control_id), None)
    if not control:
        raise HTTPException(status_code=404, detail="Control not found")
    return control

@app.get("/api/reports")
def list_reports(db: Session = Depends(get_db)):
    items = db.scalars(select(Report).order_by(Report.created_at.desc())).all()
    return [{
        "id": item.id, "name": item.name, "report_type": item.report_type,
        "asset_id": item.asset_id, "frameworks": item.frameworks,
        "include_workflow_status": item.include_workflow_status,
        "status": item.status, "created_at": item.created_at,
    } for item in items]


UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(Path(__file__).resolve().parents[1] / "uploads")))
ALLOWED_UPLOADS = {".txt", ".csv", ".xlsx", ".docx", ".pdf"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

@app.post("/api/assessments/upload", status_code=201)
async def upload_assessment(
    asset_id: int = Form(...),
    assessment_name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Linked asset was not found")

    original_name = file.filename or "uploaded-file"
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_UPLOADS:
        raise HTTPException(status_code=415, detail="Supported formats: TXT, CSV, XLSX, DOCX, PDF")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Maximum upload size is 10 MB")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_path = UPLOAD_DIR / f"{uuid4().hex}{suffix}"
    stored_path.write_bytes(content)

    try:
        extracted_text = extract_text(stored_path, suffix)
        result = analyze_text(extracted_text, asset.processors)
    except Exception as error:
        stored_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=f"Could not analyze the uploaded file: {error}") from error

    assessment = Assessment(
        asset_id=asset.id,
        name=assessment_name.strip(),
        source_type="file_upload",
        file_name=original_name,
        file_path=str(stored_path),
        detected_categories=result["categories"],
        classification=result["classification"],
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        mapped_control_ids=result["control_ids"],
    )
    db.add(assessment)
    db.flush()

    created_risks = []
    for sequence, finding in enumerate(result["findings"], start=1):
        risk = Risk(
            risk_code=f"PRIV-{assessment.id:03d}-{sequence:02d}",
            assessment_id=assessment.id,
            asset_id=asset.id,
            title=finding["title"],
            rationale=finding["rationale"],
            classification=result["classification"],
            likelihood=finding["likelihood"],
            impact=finding["impact"],
            inherent_score=finding["score"],
            mapped_control_ids=finding["controls"],
            owner=asset.owner,
        )
        db.add(risk)
        created_risks.append(risk)

    workflow = Workflow(asset_id=asset.id, assessment_id=assessment.id)
    db.add(workflow)
    db.commit()
    db.refresh(assessment)
    db.refresh(workflow)

    return {
        "assessment": {
            "id": assessment.id,
            "name": assessment.name,
            "asset_id": assessment.asset_id,
            "file_name": assessment.file_name,
            "detected_categories": assessment.detected_categories,
            "classification": assessment.classification,
            "risk_score": assessment.risk_score,
            "risk_level": assessment.risk_level,
            "mapped_control_ids": assessment.mapped_control_ids,
        },
        "risks_created": [
            {"risk_code": item.risk_code, "title": item.title, "score": item.inherent_score}
            for item in created_risks
        ],
        "workflow": {
            "id": workflow.id,
            "remediation": workflow.remediation,
            "remediation_status": workflow.remediation_status,
            "closure": workflow.closure,
            "closure_status": workflow.closure_status,
        },
        "privacy_notice": "Raw uploaded content is analyzed locally and is not sent to AI.",
    }


@app.post("/api/reports/generate", status_code=201)
def generate_report(payload: ReportCreate, db: Session = Depends(get_db)):
    asset = db.get(Asset, payload.asset_id) if payload.asset_id else None
    if payload.asset_id and not asset:
        raise HTTPException(status_code=404, detail="Report asset scope was not found")

    scope_name = asset.name if asset else "Enterprise"
    report = Report(
        name=f"{scope_name} {payload.report_type}",
        report_type=payload.report_type,
        asset_id=payload.asset_id,
        frameworks=payload.frameworks,
        include_workflow_status=payload.include_workflow_status,
        status="Ready",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    snapshot = build_snapshot(report, db, Asset, Assessment, Risk, Workflow)
    return {"report": {"id": report.id, "name": report.name, "status": report.status}, "preview": snapshot}

@app.get("/api/reports/{report_id}/preview")
def preview_report(report_id: int, db: Session = Depends(get_db)):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return build_snapshot(report, db, Asset, Assessment, Risk, Workflow)

@app.get("/api/reports/{report_id}/download")
def download_report(report_id: int, db: Session = Depends(get_db)):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    pdf = render_pdf(build_snapshot(report, db, Asset, Assessment, Risk, Workflow))
    filename = f"privacyguard-report-{report.id}.pdf"
    return StreamingResponse(
        iter([pdf]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def build_ai_context(context_type: str, context_id: str, db: Session) -> dict:
    if context_type == "risk":
        item = db.get(Risk, int(context_id))
        if not item:
            raise HTTPException(status_code=404, detail="Risk context not found")
        return {
            "context_type": "risk",
            "risk_code": item.risk_code,
            "risk_title": item.title,
            "classification": item.classification,
            "likelihood": item.likelihood,
            "impact": item.impact,
            "inherent_score": item.inherent_score,
            "rationale": item.rationale,
            "owner": item.owner,
            "mapped_controls": [
                {
                    "id": control["id"],
                    "framework": control["framework"],
                    "reference": control["reference"],
                    "title": control["title"],
                }
                for control in CONTROL_CATALOG
                if control["id"] in item.mapped_control_ids
            ],
        }

    if context_type == "asset":
        item = db.get(Asset, int(context_id))
        if not item:
            raise HTTPException(status_code=404, detail="Asset context not found")
        return {
            "context_type": "asset",
            "name": item.name,
            "asset_type": item.asset_type,
            "owner": item.owner,
            "business_purpose": item.business_purpose,
            "environment": item.environment,
            "data_location": item.data_location,
            "processors": item.processors,
        }

    if context_type == "assessment":
        item = db.get(Assessment, int(context_id))
        if not item:
            raise HTTPException(status_code=404, detail="Assessment context not found")
        return {
            "context_type": "assessment",
            "name": item.name,
            "file_name": item.file_name,
            "detected_categories": item.detected_categories,
            "classification": item.classification,
            "risk_score": item.risk_score,
            "risk_level": item.risk_level,
            "mapped_control_ids": item.mapped_control_ids,
            "mapped_controls": [
                {
                    "id": control["id"],
                    "framework": control["framework"],
                    "reference": control["reference"],
                    "title": control["title"],
                }
                for control in CONTROL_CATALOG
                if control["id"] in item.mapped_control_ids
            ],
            "raw_uploaded_content_included": False,
        }

    if context_type == "control":
        item = next((control for control in CONTROL_CATALOG if control["id"] == context_id), None)
        if not item:
            raise HTTPException(status_code=404, detail="Control context not found")
        return {"context_type": "control", **item}

    if context_type == "report":
        item = db.get(Report, int(context_id))
        if not item:
            raise HTTPException(status_code=404, detail="Report context not found")
        snapshot = build_snapshot(item, db, Asset, Assessment, Risk, Workflow)

        risk_items = snapshot["risk_items"]

        grouped_risks: dict[str, dict] = {}

        for risk in risk_items:
            title = risk["title"]

            if title not in grouped_risks:
                grouped_risks[title] = {
                    "title": title,
                    "count": 0,
                    "max_score": risk["score"],
                    "owners": set(),
                    "risk_codes": [],
                }

            group = grouped_risks[title]
            group["count"] += 1
            group["max_score"] = max(
                group["max_score"],
                risk["score"],
            )
            group["owners"].add(risk["owner"])
            group["risk_codes"].append(risk["code"])

        risk_groups = [
            {
                "title": group["title"],
                "count": group["count"],
                "max_score": group["max_score"],
                "owners": sorted(group["owners"]),
                "risk_codes": group["risk_codes"],
            }
            for group in grouped_risks.values()
        ]

        risk_groups.sort(
            key=lambda group: (
                -group["max_score"],
                -group["count"],
                group["title"],
            )
        )

        return {
            "context_type": "report",
            "name": snapshot["name"],
            "report_type": snapshot["report_type"],
            "scope": snapshot["scope"],
            "frameworks": snapshot["frameworks"],
            "assets": snapshot["assets"],
            "assessments": snapshot["assessments"],

            "risk_summary": {
                "total": snapshot["risks"],
                "high": snapshot["high_risks"],
                "group_count": len(risk_groups),
            },

            "risk_groups": risk_groups,

            "classifications": snapshot["classifications"],

            "evidence_rules": {
                "risk_groups_are_backend_calculated": True,
                "workflow_status_available": False,
                "risk_to_assessment_mapping_available": False,
                "compliance_status_available": False,
            },
        }

    raise HTTPException(status_code=400, detail="Unsupported AI context type")

@app.get("/api/ai/status")
def ai_status():
    return {
        "provider": "ollama",
        "model": os.getenv("OLLAMA_MODEL", "qwen2.5:3b"),
        "base_url": os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
        "raw_uploaded_content_sent_to_ai": False,
    }

def build_report_executive_brief(metadata: dict) -> str:
    summary = metadata.get("risk_summary", {})
    groups = metadata.get("risk_groups", [])

    total = summary.get("total", 0)
    high = summary.get("high", 0)
    scope = metadata.get("scope", "Not provided")
    assets = metadata.get("assets", 0)
    assessments = metadata.get("assessments", 0)
    frameworks = metadata.get("frameworks", [])

    framework_text = ", ".join(frameworks) if frameworks else "Not provided"

    priority_lines = []

    for group in groups:
        owners = ", ".join(group.get("owners", [])) or "Not provided"

        priority_lines.append(
            f"- {group['title']} — "
            f"{group['count']} risk item(s), "
            f"maximum score {group['max_score']}, "
            f"owner(s): {owners}."
        )

    priority_text = "\n".join(priority_lines) or (
        "Not provided in the approved metadata."
    )

    top_groups = groups[:3]

    remediation_lines = [
        (
            f"- Prioritize review of '{group['title']}' "
            f"because its backend-calculated maximum score is "
            f"{group['max_score']} across {group['count']} risk item(s)."
        )
        for group in top_groups
    ]

    remediation_text = "\n".join(remediation_lines) or (
        "Not provided in the approved metadata."
    )

    management_lines = []

    if groups:
        management_lines.append(
            f"- Review the {high} high-risk items using their existing "
            "risk codes, scores, and assigned owners."
        )
        management_lines.append(
            "- Track treatment decisions against the supplied risk records "
            "without assuming remediation status."
        )
        management_lines.append(
            "- Use the report framework alignment for review context only; "
            "it does not establish compliance."
        )

    management_text = "\n".join(management_lines) or (
        "Not provided in the approved metadata."
    )

    return f"""Executive Risk Posture:
Scope: {scope}. The approved report contains {total} calculated risks across {assets} asset(s) and {assessments} assessment(s). {high} risks meet the report's high-risk threshold. Framework alignment: {framework_text}.

Priority Risk Exposure:
{priority_text}

Remediation Priorities:
{remediation_text}

Management Actions:
{management_text}

Important Limitation:
No risk-to-assessment relationship or risk-specific workflow/remediation status is supplied in the approved report metadata. Framework alignment does not establish compliance. No additional technical controls, incidents, policies, audits, or implementation facts are inferred."""
    


def _replace_guidance_section(
    answer: str,
    heading: str,
    body: str,
    known_headings: list[str],
) -> str:
    """Replace one AI section with backend-grounded deterministic content."""
    import re

    heading_pattern = re.escape(heading)

    other_headings = [
        re.escape(item)
        for item in known_headings
        if item != heading
    ]

    if other_headings:
        lookahead = (
            r"(?=\n\s*(?:[-*]\s*)?(?:"
            + "|".join(other_headings)
            + r")\s*:?\s*(?:\n|$)|\Z)"
        )
    else:
        lookahead = r"(?=\Z)"

    pattern = (
        r"(?ims)^[ \t]*(?:[-*][ \t]*)?"
        + heading_pattern
        + r"[ \t]*:?[ \t]*\n.*?"
        + lookahead
    )

    replacement = f"{heading}:\n{body.strip()}\n"

    if re.search(pattern, answer):
        return re.sub(pattern, replacement, answer, count=1)

    return answer.rstrip() + "\n\n" + replacement.rstrip()



def _build_assessment_grounded_answer(metadata: dict) -> str:
    name = metadata.get("name") or "Not provided"
    classification = metadata.get("classification") or "Not provided"
    risk_score = metadata.get("risk_score")
    risk_level = metadata.get("risk_level") or "Not provided"

    categories = metadata.get("detected_categories") or []
    controls = metadata.get("mapped_controls") or []

    category_text = (
        "\n".join(f"- {item}" for item in categories)
        if categories
        else "- Not provided in the approved metadata."
    )

    control_text = (
        "\n".join(
            f'- {control.get("framework")} {control.get("reference")}: '
            f'{control.get("title")}'
            for control in controls
        )
        if controls
        else "- No mapped controls are provided in the approved metadata."
    )

    score_text = (
        str(risk_score)
        if risk_score is not None
        else "Not provided"
    )

    return f"""Assessment Insight:
- Assessment: {name}
- Detected categories:
{category_text}

Classification:
- {classification}

Calculated Risk:
- Risk score: {score_text}
- Risk level: {risk_level}

Mapped Controls:
{control_text}

Recommended Next Step:
- Review the assessment metadata and supporting evidence.
- Validate the documented classification and calculated risk.
- Review evidence for the explicitly mapped controls.

Important Limitation:
- Raw uploaded content was not provided to AI.
- Control implementation status and effectiveness are not provided in the approved metadata.
- No additional vulnerabilities, technical configuration, remediation status, or compliance status are inferred."""


def _ground_ai_structured_sections(
    context_type: str,
    metadata: dict,
    answer: str,
) -> str:
    if context_type == "risk":
        controls = metadata.get("mapped_controls") or []

        if controls:
            body = "\n".join(
                f'- {control.get("framework")} {control.get("reference")}: '
                f'{control.get("title")}'
                for control in controls
            )
        else:
            body = "- No mapped controls are provided in the approved metadata."

        headings = [
            "Risk Insight",
            "Risk Significance",
            "Mapped Control Guidance",
            "Recommended Next Step",
            "Important Limitation",
        ]

        return _replace_guidance_section(
            answer,
            "Mapped Control Guidance",
            body,
            headings,
        )

    if context_type == "assessment":
        controls = metadata.get("mapped_controls") or []

        if controls:
            body = "\n".join(
                f'- {control.get("framework")} {control.get("reference")}: '
                f'{control.get("title")}'
                for control in controls
            )
        else:
            body = "- No mapped controls are provided in the approved metadata."

        headings = [
            "Assessment Insight",
            "Classification",
            "Calculated Risk",
            "Mapped Controls",
            "Recommended Next Step",
            "Important Limitation",
        ]

        return _replace_guidance_section(
            answer,
            "Mapped Controls",
            body,
            headings,
        )

    return answer



def _build_control_map_risk_guidance(metadata: dict) -> str:
    """
    Dynamic, deterministic and evidence-grounded Control Map guidance.
    Every section is derived from approved risk metadata only.
    """

    def value(key, fallback="Not provided in the approved metadata."):
        v = metadata.get(key)
        if v is None or v == "" or v == []:
            return fallback
        return str(v)

    risk_code = value("risk_code")
    risk_title = value("risk_title")
    classification = value("classification")
    owner = value("owner")
    rationale = value("rationale")
    likelihood = value("likelihood")
    impact = value("impact")
    inherent_score = value("inherent_score")

    controls = metadata.get("mapped_controls") or []

    # ---------------------------------------------------------
    # Exact mapped controls
    # ---------------------------------------------------------

    if controls:
        mapped_controls = "\n".join(
            f"- {c.get('framework') or 'Framework not provided'} "
            f"{c.get('reference') or 'Reference not provided'}: "
            f"{c.get('title') or 'Title not provided'}"
            for c in controls
        )

        control_refs = ", ".join(
            f"{c.get('framework') or 'Framework not provided'} "
            f"{c.get('reference') or 'Reference not provided'}"
            for c in controls
        )
    else:
        mapped_controls = (
            "- No mapped controls are provided in the approved metadata."
        )
        control_refs = "the currently documented risk"

    # ---------------------------------------------------------
    # Risk-specific validation target
    # ---------------------------------------------------------

    condition_target = risk_title

    # ---------------------------------------------------------
    # Dynamic next steps
    # ---------------------------------------------------------

    next_steps = [
        f'1. Review the documented condition "{condition_target}".',
        f"2. Validate the condition against the current environment using the documented rationale: {rationale}",
    ]

    if controls:
        next_steps.append(
            f"3. Evaluate the documented condition against the mapped controls: {control_refs}."
        )
    else:
        next_steps.append(
            "3. Determine whether controls should be mapped after validating the documented condition."
        )

    suggested_next_step = "\n".join(next_steps)

    # ---------------------------------------------------------
    # Dynamic validation steps
    # ---------------------------------------------------------

    validation_steps = [
        f"1. Confirm whether the condition documented as \"{risk_title}\" is still present.",
        f"2. Validate the recorded likelihood ({likelihood}) and impact ({impact}) against current evidence.",
    ]

    if controls:
        validation_steps.append(
            f"3. Verify the implementation status of the mapped control(s): {control_refs}."
        )
    else:
        validation_steps.append(
            "3. Record whether any controls currently address the documented condition."
        )

    # ---------------------------------------------------------
    # Dynamic evidence requirements
    # ---------------------------------------------------------

    evidence_lines = [
        f'- Evidence confirming or disproving the documented condition "{risk_title}".',
        f"- Evidence supporting the recorded likelihood ({likelihood}) and impact ({impact}).",
    ]

    if controls:
        evidence_lines.append(
            f"- Implementation evidence for the mapped control(s): {control_refs}."
        )
    else:
        evidence_lines.append(
            "- Evidence identifying any controls currently associated with this risk."
        )

    evidence_required = "\n".join(evidence_lines)

    # ---------------------------------------------------------
    # Dynamic limitation
    # ---------------------------------------------------------

    limitations = []

    if "implementation_status" not in metadata:
        limitations.append("mapped-control implementation status")

    if "treatment_status" not in metadata:
        limitations.append("risk treatment status")

    if "supporting_evidence" not in metadata:
        limitations.append("supporting evidence")

    if "technical_configuration" not in metadata:
        limitations.append("technical configuration")

    limitation = (
        "The approved metadata for "
        f"{risk_code} does not provide "
        + ", ".join(limitations)
        + "."
        if limitations
        else
        f"No additional evidence limitation is recorded for {risk_code}."
    )

    return f"""Risk Analysis:
Risk {risk_code} — {risk_title}.
Classification: {classification}.
Owner: {owner}.
Documented rationale: {rationale}.
Likelihood: {likelihood}.
Impact: {impact}.
Inherent score: {inherent_score}.

Classification Explanation:
Recorded classification for {risk_code}: {classification}.
The classification is taken directly from the approved metadata associated with "{risk_title}".
No additional classification assumption is made.

Control Map Guidance:
Mapped controls associated with {risk_code}:
{mapped_controls}

Suggested Next Step:
{suggested_next_step}

Validation Steps:
{chr(10).join(validation_steps)}

Evidence Required:
{evidence_required}

Important Limitation:
{limitation}
"""



@app.post("/api/ai/guidance")
def ai_guidance(payload: AiGuidanceRequest, db: Session = Depends(get_db)):
    metadata = build_ai_context(payload.context_type, payload.context_id, db)

    is_risk_report = (
        payload.context_type == "report"
        and "risk" in str(metadata.get("report_type", "")).lower()
    )

    if is_risk_report:
        answer = build_report_executive_brief(metadata)
        provider = "privacyguard-evidence-engine"
    else:
        try:
            if payload.context_type == "assessment":
                answer = _build_assessment_grounded_answer(metadata)
                provider = "privacyguard-evidence-engine"
            elif payload.context_type == "risk":
                answer = _build_control_map_risk_guidance(metadata)
                provider = "privacyguard-evidence-engine"
            else:
                answer = ask_local_ollama(metadata, payload.question)

                answer = _ground_ai_structured_sections(
                    payload.context_type,
                    metadata,
                    answer,
                )

                provider = "ollama"
        except Exception as error:
            raise HTTPException(
                status_code=502,
                detail=f"Local AI request failed: {type(error).__name__}",
            ) from error

    return {
        "provider": provider,
        "context": metadata,
        "answer": answer,
        "disclaimer": "AI guidance supports privacy and security review; it is not legal advice.",
    }
