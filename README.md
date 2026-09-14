# PrivacyGuard AI

### Enterprise Privacy & Security Assessor

PrivacyGuard AI is a full-stack privacy and security assessment platform that turns approved assessment material into explainable data classifications, calculated risks, mapped GDPR and ISO/IEC 27001:2022 controls, workflow follow-up, and exportable reports.

> **Privacy-first design:** uploaded content is analyzed locally. AI guidance is grounded in approved metadata only and is not legal advice.

## Platform workflow

```text
Asset → Assessment upload → Data classification → Calculated risks → Control mapping → Workflow follow-up → Report → AI guidance
```

## Core capabilities

- Asset Inventory with manual intake or Asset Profile upload
- Local analysis of TXT, CSV, XLSX, DOCX, and PDF assessment files
- Classification: Internal, Confidential, Restricted PII, and Sensitive PII
- Calculated privacy and security risks with owners and mapped controls
- GDPR and ISO/IEC 27001:2022 control mappings
- Workflow remediation and closure tracking
- PDF assessment reports and CSV risk exports
- Local Ollama guidance using approved metadata only

## Product walkthrough

| Stage | What the platform does | Screenshot |
|---|---|---|
| 1. Asset intake | Create an asset manually or from an Asset Profile. | `docs/screenshots/asset-created.png` |
| 2. Assessment upload | Upload approved material and link it to an asset. | `docs/screenshots/assessment-upload.png` |
| 3. Analysis | Detect data categories, classification, and risk level. | `docs/screenshots/analysis-risks.png` |
| 4. Risks | Generate explainable privacy and security risks. | `docs/screenshots/generated-risks.png` |
| 5. Controls | Map GDPR and ISO/IEC 27001:2022 controls. | `docs/screenshots/mapped-controls-analysis.png` |
| 6. Workflow | Track remediation and closure status. | `docs/screenshots/mapped-controls.png` |
| 7. Reports | Generate executive-ready report output. | `docs/screenshots/generated-report.png` |
| 8. AI guidance | Ask for local, metadata-only guidance. | `docs/screenshots/AI Assistant(1).png` |

## Roadmap

### Completed — V1

- [x] Asset intake and inventory
- [x] Local file extraction and classification
- [x] Calculated risks and control mappings
- [x] GDPR and ISO/IEC 27001:2022 control catalog
- [x] Remediation and closure workflows
- [x] Report generation and export
- [x] Local Ollama guidance

### In progress — V1.1

- [ ] Live Controls & Compliance library linked to workspace evidence
- [ ] Live Control Map: Control → Risk → Assessment → Asset
- [ ] Railway public demo using synthetic data only
- [ ] GitHub Actions build validation

### Planned — V2

- [ ] Authentication and role-based access control
- [ ] Audit trail and evidence attachments
- [ ] Multi-workspace support
- [ ] Private hosted Ollama deployment

## Local development

```bash
# API
source backend/.venv/bin/activate
uvicorn app.main:app --app-dir backend --reload --port 8001

# Web
cd artifacts/privacyguard-ai
PORT=5174 BASE_PATH=/ pnpm run dev
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the Railway service setup.
