from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

def build_snapshot(report, db, Asset, Assessment, Risk, Workflow):
    asset = db.get(Asset, report.asset_id) if report.asset_id else None
    assessment_query = db.query(Assessment)
    risk_query = db.query(Risk)
    workflow_query = db.query(Workflow)

    if asset:
        assessments = assessment_query.filter(Assessment.asset_id == asset.id).all()
        risks = risk_query.filter(Risk.asset_id == asset.id).all()
        workflows = workflow_query.filter(Workflow.asset_id == asset.id).all()
        scope = asset.name
    else:
        assessments = assessment_query.all()
        risks = risk_query.all()
        workflows = workflow_query.all()
        scope = "All linked assets"

    return {
        "report_id": report.id,
        "name": report.name,
        "report_type": report.report_type,
        "scope": scope,
        "frameworks": report.frameworks,
        "generated_at": report.created_at.isoformat(),
        "assets": 1 if asset else db.query(Asset).count(),
        "assessments": len(assessments),
        "risks": len(risks),
        "high_risks": len([risk for risk in risks if risk.inherent_score >= 16]),
        "classifications": [
            {"assessment": item.name, "classification": item.classification, "risk_level": item.risk_level}
            for item in assessments
        ],
        "risk_items": [
            {"code": item.risk_code, "title": item.title, "score": item.inherent_score, "owner": item.owner}
            for item in risks
        ],
        "workflow_statuses": [
            {
                "assessment_id": item.assessment_id,
                "remediation": item.remediation_status,
                "closure": item.closure_status,
            }
            for item in workflows
        ],
    }

def render_pdf(snapshot: dict) -> bytes:
    stream = BytesIO()
    document = SimpleDocTemplate(
        stream,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )
    styles = getSampleStyleSheet()
    story = [
        Paragraph("PrivacyGuard AI", styles["Title"]),
        Paragraph("Enterprise Privacy & Security Assessor", styles["Heading2"]),
        Spacer(1, 12),
        Paragraph(snapshot["name"], styles["Heading1"]),
        Paragraph(f"Scope: {snapshot['scope']}", styles["BodyText"]),
        Paragraph(f"Frameworks: {', '.join(snapshot['frameworks'])}", styles["BodyText"]),
        Spacer(1, 12),
    ]

    summary = [
        ["Assets", "Assessments", "Calculated risks", "High risks"],
        [str(snapshot["assets"]), str(snapshot["assessments"]), str(snapshot["risks"]), str(snapshot["high_risks"])],
    ]
    summary_table = Table(summary, colWidths=[4 * cm] * 4)
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0b5ed7")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#b7cce8")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story += [summary_table, Spacer(1, 16), Paragraph("Calculated risks", styles["Heading2"])]

    risk_rows = [["Code", "Risk", "Score", "Owner"]]
    risk_rows += [
        [item["code"], item["title"], str(item["score"]), item["owner"]]
        for item in snapshot["risk_items"]
    ] or [["No calculated risks", "", "", ""]]

    risks_table = Table(risk_rows, colWidths=[3 * cm, 8 * cm, 2 * cm, 4 * cm])
    risks_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#102b4e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c7d5e6")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story += [risks_table, Spacer(1, 14)]
    story.append(Paragraph(
        "This report is generated from approved local assessment metadata. "
        "It supports privacy and security review and is not legal advice.",
        styles["BodyText"],
    ))
    document.build(story)
    return stream.getvalue()
