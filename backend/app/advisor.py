import json
import os
import httpx


def _response_format(metadata: dict) -> str:
    context_type = metadata.get("context_type", "")

    if context_type == "report":
        name = str(metadata.get("name", "")).lower()

        if "risk" in name:
            return """
Respond using exactly these headings:
- Executive Risk Posture
- Priority Risk Exposure
- Remediation Priorities
- Management Actions
- Important Limitation

For this risk report:
- Base every statement only on supplied report metadata.
- Use exact counts when available.
- Treat risk_items as risks/findings, never as controls.
- Use each risk item's exact code, title, score, and owner when referenced.
- Never rename or expand a supplied risk title.
- Do not introduce acronyms such as PAM, IAM, DLP, EDR, MFA, or other
  technologies unless the exact term already appears in the supplied metadata.
- A risk title containing "MFA" permits mentioning MFA only in relation to
  that exact risk title.
- workflow_statuses are assessment-level workflow records.
- Never associate a workflow status with a risk code, risk title, or owner
  unless an explicit relationship is supplied in the metadata.
- Never claim that a specific risk is Partial, Ongoing, Open, In review,
  Completed, remediated, or closed based only on workflow_statuses.
- Do not claim that a risk belongs to a named assessment unless an explicit
  risk-to-assessment relationship is supplied.
- Do not call a risk a vulnerability, control, compliance failure, or
  regulatory violation unless the metadata explicitly uses that term.
- Framework names indicate report alignment only. They do not prove
  compliance with those frameworks.
- Do not invent vulnerability types, control weaknesses, training needs,
  technologies, incidents, policies, audits, or remediation activities.
- Recommendations must be directly traceable to an exact supplied risk title.
- If the metadata does not support a relationship or conclusion, state:
  "Not provided in the approved metadata."
"""

        if "control" in name:
            return """
Respond using exactly these headings:
- Executive Control Posture
- Control Coverage
- Priority Control Gaps
- Recommended Control Actions
- Important Limitation

For this control report:
- Discuss only controls and coverage explicitly supplied in metadata.
- Do not invent missing controls, implementation status, audit results,
  technical measures, or compliance claims.
"""

        return """
Respond using exactly these headings:
- Executive Assessment Summary
- Scope and Classification
- Risk Significance
- Control Considerations
- Management Actions
- Important Limitation

For this report:
- Use only facts explicitly supplied in the report metadata.
- Do not infer unsupported findings or implementation details.
"""

    if context_type == "risk":
        return """
Respond using EXACTLY these six headings, each on its own line:

Risk Analysis:
Classification Explanation:
Control Map Guidance:
Suggested Next Step:
Validation Steps:
Evidence Required:

CONTROL MAP AI RULES — MANDATORY:

GENERAL:
- Generate guidance specifically for the selected risk and its supplied metadata.
- The content MUST change when the selected risk, rationale, classification,
  likelihood, impact, score, owner, or mapped controls change.
- Use ONLY approved metadata.
- Never invent facts, technologies, controls, evidence, implementation status,
  compliance status, incidents, vulnerabilities, or remediation work.
- Do not provide legal advice.

Risk Analysis:
- Identify the selected risk using its exact risk_code and risk_title.
- State classification, owner, likelihood, impact, and inherent_score exactly
  as supplied.
- Use the exact supplied rationale as the evidence basis.
- Explain why THIS documented risk deserves review using only those supplied
  fields.
- Do not invent consequences, attack paths, probability, business impact,
  breach scenarios, or technical weaknesses.

Classification Explanation:
- State the exact supplied classification.
- Explain its relationship to THIS selected risk only from supplied metadata.
- Do not infer what data exists in the asset unless explicitly supplied.
- If the metadata does not explain why the classification was assigned,
  explicitly state that the reason is not provided.

Control Map Guidance:
- Use ONLY mapped_controls supplied for THIS selected risk.
- For each mapped control use only its exact framework, reference, and title.
- Explain that these are the controls currently mapped to the selected risk.
- Do not invent control requirements or implementation details.
- Do not claim compliance or non-compliance.

Suggested Next Step:
- Generate concise evidence-validation actions specifically tied to the
  selected risk title, rationale, and mapped controls.
- The actions MUST reference the selected risk condition where useful.
- Do not use a generic reusable three-step template.
- Do not order implementation or remediation.
- Do not invent technologies, policies, audits, monitoring, training,
  timelines, budgets, or procedures.

Validation Steps:
- Generate validation steps specifically for THIS risk.
- Base the steps on the supplied risk title/rationale and mapped controls.
- Focus on verifying whether the documented condition exists and on checking
  available evidence for the mapped controls.
- Do not claim that any validation has already occurred.
- Do not invent implementation details.

Evidence Required:
- Identify evidence categories that would be needed to validate THIS specific
  documented risk and its mapped controls.
- Phrase missing evidence as evidence to obtain or verify, never as evidence
  known to exist.
- Stay within the terminology present in the supplied metadata.
- If a specific evidence type cannot be derived safely, state:
  "Specific evidence type is not provided in the approved metadata."
- End this section with a short "Important Limitation:" statement identifying
  material facts absent from the approved metadata.

The six sections must be concise enough to display inside the Control Map cards.
"""

    if context_type == "control":
        return """
Respond using exactly these headings, each on its own line:
Control Insight:
Control Objective:
Technical Measures:
Organizational Measures:
Recommended Next Step:
Important Limitation:

STRICT CONTROL RESPONSE RULES:

Control Insight:
- State the exact framework, reference, and title supplied in metadata.
- Do not rename, reinterpret, or expand the control.

Control Objective:
- Use only the exact meaning supplied in the "why" field.
- Do not add regulatory, legal, audit, certification, or compliance claims.

Technical Measures:
- List every item in technical_measures exactly as supplied.
- Do not omit, rename, explain, expand, or add measures.
- If the list is empty, state that technical measures are not provided.

Organizational Measures:
- List every item in organizational_measures exactly as supplied.
- Do not omit, rename, explain, expand, or add measures.
- If the list is empty, state that organizational measures are not provided.

Recommended Next Step:
- Recommend evidence validation only.
- Review whether the supplied technical and organizational measures are
  documented and supported by evidence for the selected control.
- Do not claim that any measure is implemented, effective, ineffective,
  missing, compliant, or non-compliant.
- Do not invent stakeholders, technologies, policies, procedures,
  monitoring activities, audits, owners, timelines, or remediation work.

Important Limitation:
- State that implementation status, effectiveness, and supporting evidence
  are not provided unless those facts explicitly exist in metadata.
- Do not invent missing facts.

Do not provide legal advice.
"""

    if context_type == "asset":
        return """
Respond using exactly these headings, each on its own line:
Asset Insight:
Approved Asset Context:
Risk Considerations:
Recommended Next Step:
Important Limitation:

STRICT ASSET RESPONSE RULES:

Asset Insight:
- State the exact asset name, asset_type, and owner.
- State business_purpose exactly as supplied when available.
- Do not infer what data the asset contains from its name, type,
  owner, business purpose, environment, location, or processor.
- For example, an HR asset does not prove that employee PII,
  sensitive data, payroll data, or health data is present.

Approved Asset Context:
- State environment exactly as supplied.
- State data_location exactly as supplied.
- List processors exactly as supplied.
- A processor or platform name proves only that it is recorded in
  the approved metadata.
- Do not infer security features, architecture, configuration,
  contractual status, data residency, or implementation details.

Risk Considerations:
- Do not invent risks.
- Do not infer vulnerabilities, threats, classification, likelihood,
  impact, controls, incidents, or regulatory requirements.
- If no risk information is supplied, state:
  "Risk information is not provided in the approved asset metadata."

Recommended Next Step:
- Recommend metadata and evidence validation only.
- Review the approved asset metadata for accuracy and completeness.
- Validate the documented owner, business purpose, environment,
  data location, and processor information.
- Identify whether separate approved assessments or risk records
  exist before making risk or control conclusions.
- Do not recommend implementation, remediation, configuration,
  policies, audits, training, monitoring, or platform-specific controls.

Important Limitation:
- State that data categories, classification, risk records, control
  implementation, security configuration, and supporting evidence
  are not part of this asset context unless explicitly supplied.
- Do not invent missing facts.

Do not make compliance or non-compliance claims.
Do not provide legal advice.
"""

    return """
Respond using exactly these headings, each on its own line:
Assessment Insight:
Classification:
Calculated Risk:
Mapped Controls:
Recommended Next Step:
Important Limitation:

STRICT ASSESSMENT RESPONSE RULES:

Assessment Insight:
- State the exact assessment name.
- List detected_categories exactly as supplied.
- State only facts explicitly present in approved metadata.
- Do not claim that you inspected or analyzed the uploaded file.
- Do not infer what the detected categories contain.

Classification:
- State the classification exactly as supplied.
- Do not explain what that classification means unless an explicit
  explanation is supplied in metadata.
- Do not infer confidentiality, integrity, legal, regulatory, or
  protection requirements from the classification.

Calculated Risk:
- State the exact risk_score and risk_level.
- Treat them only as backend-calculated assessment values.
- Do not infer vulnerabilities, threats, likelihood, impact,
  exposure, urgency, or remediation requirements unless explicitly supplied.

Mapped Controls:
- Use ONLY mapped_controls supplied in metadata.
- For each control, state only its exact framework, reference, and title.
- Never derive control names from mapped_control_ids.
- Never rename, expand, reinterpret, or invent a control.
- Do not claim that a mapped control is implemented, missing,
  effective, ineffective, passed, failed, compliant, or non-compliant.
- Mapping indicates association only.

Recommended Next Step:
- Recommend evidence validation only.
- Review the assessment metadata and supporting evidence.
- Validate the documented classification and calculated risk.
- Review evidence for the explicitly mapped controls.
- Do not order implementation, remediation, policy changes,
  technical changes, audits, training, monitoring, or certification work.
- Do not use compliance or non-compliance conclusions.

Important Limitation:
- State that raw uploaded content was not provided to AI.
- State that implementation status and control effectiveness are not
  provided unless explicitly present in metadata.
- Do not invent missing facts.

Do not provide legal advice.
"""


def ask_local_ollama(metadata: dict, question: str) -> str:
    model = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
    base_url = os.getenv(
        "OLLAMA_BASE_URL",
        "http://127.0.0.1:11434",
    ).rstrip("/")

    response_format = _response_format(metadata)

    prompt = f"""You are PrivacyGuard AI, a local privacy and security assessment assistant.

EVIDENCE RULES — MANDATORY:
Use ONLY the approved metadata below.
Treat the metadata as the complete evidence available to you.

Never invent, infer, assume, or speculate about:
- vulnerabilities not explicitly supplied
- technical controls not explicitly supplied
- security monitoring capabilities
- access-control weaknesses
- encryption implementation
- employee training
- policies or procedures
- incidents
- audit requirements or audit results
- remediation work not explicitly supplied
- GDPR articles or ISO/IEC 27001 controls not explicitly supplied
- compliance or certification status

Do not claim that you inspected an uploaded file.

Counts describe quantity only.
For example, "19 high risks" proves only that 19 risks meet the
high-risk threshold. It does NOT prove what those risks are.

When metadata lacks the detail required for a conclusion, write:
"Not provided in the approved metadata."

When mapped_controls is supplied, cite ONLY its exact framework,
reference, and title. Never rename controls or create new ones.

Give concise, practical privacy and security guidance.
Do not provide legal advice.
Do not change workflow statuses.
Do not create remediation or evidence records.

Approved metadata:
{json.dumps(metadata, ensure_ascii=False, indent=2)}

User question:
{question}

{response_format}
"""

    response = httpx.post(
        f"{base_url}/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
        },
        timeout=120,
    )

    response.raise_for_status()

    answer = response.json().get("response", "").strip()

    if not answer:
        raise RuntimeError("Local model returned an empty response")

    return answer
