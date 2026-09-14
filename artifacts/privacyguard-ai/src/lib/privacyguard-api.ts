// @ts-nocheck
const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === "true";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001/api";
const DEMO_STORAGE_KEY = "privacyguard-static-demo-v1";
const now = () => new Date().toISOString();

const demoControls = [
  { id: "gdpr-article-5", framework: "GDPR", reference: "Article 5", title: "Principles relating to processing" },
  { id: "gdpr-article-32", framework: "GDPR", reference: "Article 32", title: "Security of processing" },
  { id: "iso-a-5-15", framework: "ISO/IEC 27001:2022", reference: "A.5.15", title: "Access control" },
  { id: "iso-a-8-10", framework: "ISO/IEC 27001:2022", reference: "A.8.10", title: "Information deletion" },
  { id: "iso-a-8-24", framework: "ISO/IEC 27001:2022", reference: "A.8.24", title: "Use of cryptography" },
];

const createDemoState = () => {
  const timestamp = now();
  const assets = [
    { id: 1, name: "Customer Portal", asset_type: "Web application", owner: "Data Engineering", business_purpose: "Customer account access and support services.", environment: "Cloud production", data_location: "EU region, AWS", processors: ["Cloud email provider"], updated_at: timestamp },
    { id: 2, name: "HR Directory", asset_type: "Internal system", owner: "People Operations", business_purpose: "Employee directory and workforce administration.", environment: "Corporate network", data_location: "Cairo, Egypt", processors: ["Identity provider"], updated_at: timestamp },
    { id: 3, name: "Supplier Collaboration Portal", asset_type: "SaaS service", owner: "Procurement", business_purpose: "Supplier onboarding and contract collaboration.", environment: "SaaS platform", data_location: "EU region", processors: ["Microsoft 365"], updated_at: timestamp },
  ];
  const assessments = [
    { id: 1, name: "Customer Portal Privacy Assessment", asset_id: 1, source_type: "Demo file", file_name: "customer-portal-assessment.txt", detected_categories: ["Personal Data", "Sensitive Data"], classification: "Sensitive PII", risk_level: "High", mapped_control_ids: ["gdpr-article-32", "iso-a-5-15", "iso-a-8-24"], updated_at: timestamp },
    { id: 2, name: "HR Directory Retention Assessment", asset_id: 2, source_type: "Demo file", file_name: "employee-directory.csv", detected_categories: ["Personal Data", "Support Data"], classification: "Restricted PII", risk_level: "High", mapped_control_ids: ["gdpr-article-5", "iso-a-8-10"], updated_at: timestamp },
    { id: 3, name: "Supplier Collaboration Review", asset_id: 3, source_type: "Demo file", file_name: "supplier-collaboration.xlsx", detected_categories: ["Personal Data"], classification: "Confidential", risk_level: "Medium", mapped_control_ids: ["gdpr-article-32", "iso-a-5-15"], updated_at: timestamp },
  ];
  const risks = [
    { id: 1, risk_code: "PRIV-001", title: "Privileged access lacks MFA", asset_id: 1, assessment_id: 1, classification: "Sensitive PII", likelihood: "High", impact: "High", inherent_score: 20, rationale: "Administrative access to sensitive customer data requires strong authentication.", owner: "Data Engineering", mapped_control_ids: ["gdpr-article-32", "iso-a-5-15"] },
    { id: 2, risk_code: "PRIV-002", title: "Retention period not defined", asset_id: 2, assessment_id: 2, classification: "Restricted PII", likelihood: "Medium", impact: "High", inherent_score: 16, rationale: "Employee data retention and deletion requirements are not documented.", owner: "People Operations", mapped_control_ids: ["gdpr-article-5", "iso-a-8-10"] },
    { id: 3, risk_code: "PRIV-003", title: "Third-party processor review required", asset_id: 3, assessment_id: 3, classification: "Confidential", likelihood: "Medium", impact: "Medium", inherent_score: 12, rationale: "Supplier processing requires a documented security review.", owner: "Procurement", mapped_control_ids: ["gdpr-article-32", "iso-a-5-15"] },
  ];
  const workflows = [
    { id: 1, asset_id: 1, assessment_id: 1, remediation: "Ongoing", remediation_status: "Ongoing", closure: "Open", closure_status: "Open", updated_at: timestamp },
    { id: 2, asset_id: 2, assessment_id: 2, remediation: "In review", remediation_status: "In review", closure: "In review", closure_status: "In review", updated_at: timestamp },
    { id: 3, asset_id: 3, assessment_id: 3, remediation: "Completed", remediation_status: "Completed", closure: "Completed", closure_status: "Completed", updated_at: timestamp },
  ];
  return { assets, assessments, risks, workflows, reports: [] };
};

const demoState = () => {
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  const state = createDemoState();
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  return state;
};

const saveDemoState = (state: any) => localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
const nextDemoId = (items: any[]) => Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;

const demoOverview = (state: any) => {
  const mapped = state.risks.flatMap((risk: any) => risk.mapped_control_ids || []);
  const distribution = { Internal: 0, Confidential: 0, "Restricted PII": 0, "Sensitive PII": 0, Unknown: 0 } as any;
  state.assessments.forEach((item: any) => distribution[item.classification] = (distribution[item.classification] || 0) + 1);
  return {
    linked_assets: state.assets.length,
    assessments: state.assessments.length,
    calculated_risks: state.risks.length,
    high_priority_risks: state.risks.filter((item: any) => item.inherent_score >= 16).length,
    mapped_controls: mapped.length,
    unique_controls: new Set(mapped).size,
    control_catalog_size: demoControls.length,
    classification_distribution: distribution,
  };
};

const demoApi = async (path: string, options: RequestInit = {}) => {
  const state = demoState();
  const method = (options.method || "GET").toUpperCase();
  if (method === "GET") {
    if (path === "/overview") return demoOverview(state);
    if (path === "/assets") return state.assets;
    if (path === "/assessments") return state.assessments;
    if (path === "/risks") return state.risks;
    if (path === "/workflows") return state.workflows;
    if (path === "/controls") return demoControls;
    if (path === "/reports") return state.reports;
  }

  if (path === "/assets/intake" && method === "POST") {
    const form = options.body as FormData;
    const attachment = form.get("attachment") as File | null;
    const asset = {
      id: nextDemoId(state.assets),
      name: String(form.get("name") || attachment?.name?.replace(/\.[^.]+$/, "") || "Imported Asset Profile").trim(),
      asset_type: String(form.get("asset_type") || "Application"),
      owner: String(form.get("owner") || "Security Engineering"),
      business_purpose: String(form.get("business_purpose") || "Imported Asset Profile review"),
      environment: String(form.get("environment") || "Cloud application"),
      data_location: String(form.get("data_location") || "EU region"),
      processors: String(form.get("processors") || "").split(",").map((item) => item.trim()).filter(Boolean),
      updated_at: now(),
    };
    state.assets.unshift(asset); saveDemoState(state); return asset;
  }

  if (path === "/assessments/upload" && method === "POST") {
    const form = options.body as FormData;
    const assetId = Number(form.get("asset_id"));
    const file = form.get("file") as File | null;
    const assessment = {
      id: nextDemoId(state.assessments),
      name: String(form.get("assessment_name") || "New privacy assessment"),
      asset_id: assetId,
      source_type: "Browser demo upload",
      file_name: file?.name || "uploaded-assessment.txt",
      detected_categories: ["Personal Data", "Sensitive Data"],
      classification: "Sensitive PII",
      risk_level: "High",
      mapped_control_ids: ["gdpr-article-32", "iso-a-5-15"],
      updated_at: now(),
    };
    const asset = state.assets.find((item: any) => item.id === assetId);
    const risk = { id: nextDemoId(state.risks), risk_code: `PRIV-${String(state.risks.length + 1).padStart(3, "0")}`, title: "Sensitive data control review required", asset_id: assetId, assessment_id: assessment.id, classification: assessment.classification, likelihood: "Medium", impact: "High", inherent_score: 16, rationale: "Browser demo generated this review from the uploaded assessment.", owner: asset?.owner || "Unassigned", mapped_control_ids: assessment.mapped_control_ids };
    const workflow = { id: nextDemoId(state.workflows), asset_id: assetId, assessment_id: assessment.id, remediation: "Ongoing", remediation_status: "Ongoing", closure: "Open", closure_status: "Open", updated_at: now() };
    state.assessments.unshift(assessment); state.risks.unshift(risk); state.workflows.unshift(workflow); saveDemoState(state);
    return { assessment, risks: [risk], workflow };
  }

  if (path.startsWith("/workflows/") && method === "PUT") {
    const workflowId = Number(path.split("/").pop());
    const values = JSON.parse(String(options.body || "{}"));
    const workflow = state.workflows.find((item: any) => item.id === workflowId);
    if (!workflow) throw new Error("Workflow not found");
    if (values.remediation !== undefined) { workflow.remediation = values.remediation; workflow.remediation_status = values.remediation; }
    if (values.closure !== undefined) { workflow.closure = values.closure; workflow.closure_status = values.closure; }
    workflow.updated_at = now(); saveDemoState(state); return workflow;
  }

  if (path === "/ai/guidance" && method === "POST") {
    return { answer: "Demo guidance: confirm data ownership, document retention, enforce MFA for privileged access, and validate the mapped controls before closure.", provider: "browser-demo" };
  }
  throw new Error(`Demo endpoint is not available: ${method} ${path}`);
};

export async function apiRequest(path: string, options: RequestInit = {}) {
  if (STATIC_DEMO) return demoApi(path, options);
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return response.json();
}
const formatDate = (value?: string) =>
  value ? new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(value)) : "—";

const riskRank: Record<string, number> = { High: 3, Medium: 2, Low: 1, Unknown: 0 };

export async function loadWorkspaceData() {
  const [overview, rawAssets, rawAssessments, rawRisks, rawWorkflows] = await Promise.all([
    apiRequest("/overview"),
    apiRequest("/assets"),
    apiRequest("/assessments"),
    apiRequest("/risks"),
    apiRequest("/workflows"),
  ]);

  const assessmentById = new Map(rawAssessments.map((item: any) => [item.id, item]));
  const assessmentsForAsset = new Map<number, any[]>();
  rawAssessments.forEach((item: any) => {
    assessmentsForAsset.set(item.asset_id, [...(assessmentsForAsset.get(item.asset_id) || []), item]);
  });

  const risksForAsset = new Map<number, any[]>();
  rawRisks.forEach((item: any) => {
    risksForAsset.set(item.asset_id, [...(risksForAsset.get(item.asset_id) || []), item]);
  });

  const workflowByAssessment = new Map(rawWorkflows.map((item: any) => [item.assessment_id, item]));

  const assets = rawAssets.map((item: any) => {
    const linkedAssessments = assessmentsForAsset.get(item.id) || [];
    const linkedRisks = risksForAsset.get(item.id) || [];
    const latestAssessment = linkedAssessments
      .slice()
      .sort((a: any, b: any) => new Date(b.updated_at).valueOf() - new Date(a.updated_at).valueOf())[0];

    const highestRisk = linkedRisks.reduce(
      (highest: string, risk: any) => riskRank[riskLevel(risk.inherent_score)] > riskRank[highest] ? riskLevel(risk.inherent_score) : highest,
      "Unknown",
    );

    return {
      id: item.id,
      name: item.name,
      owner: item.owner,
      purpose: item.business_purpose,
      environment: item.environment,
      location: item.data_location,
      processors: (item.processors || []).join(", ") || "None specified",
      classification: latestAssessment?.classification || "Unknown",
      assessments: linkedAssessments.length,
      risk: highestRisk,
      controls: new Set(linkedAssessments.flatMap((assessment: any) => assessment.mapped_control_ids || [])).size,
      assetType: item.asset_type,
      updated: formatDate(item.updated_at),
    };
  });

  const assetName = new Map(assets.map((item: any) => [item.id, item.name]));
  const assetOwner = new Map(assets.map((item: any) => [item.id, item.owner]));

  const assessments = rawAssessments.map((item: any) => {
    const workflow = workflowByAssessment.get(item.id);
    return {
      id: item.id,
      name: item.name,
      asset: assetName.get(item.asset_id) || `Asset #${item.asset_id}`,
      categories: item.detected_categories || [],
      classification: item.classification,
      risk: item.risk_level,
      workflow: workflow?.closure_status === "Completed" ? "Completed" : (workflow?.remediation_status || "Open"),
      date: formatDate(item.updated_at),
      file: item.file_name,
    };
  });

  const workflows = rawWorkflows.map((item: any) => {
    const assessment = assessmentById.get(item.assessment_id);
    const linkedRisks = rawRisks.filter((risk: any) => risk.assessment_id === item.assessment_id);
    return {
      id: item.id,
      asset: assetName.get(item.asset_id) || `Asset #${item.asset_id}`,
      assessment: assessment?.name || `Assessment #${item.assessment_id}`,
      classification: assessment?.classification || "Unknown",
      risk: linkedRisks.reduce(
        (highest: string, risk: any) => riskRank[riskLevel(risk.inherent_score)] > riskRank[highest] ? riskLevel(risk.inherent_score) : highest,
        "Unknown",
      ),
      control: [...new Set(linkedRisks.flatMap((risk: any) => risk.mapped_control_ids || []))].join(", ") || "—",
      owner: assetOwner.get(item.asset_id) || "Unassigned",
      remediation: item.remediation,
      closure: item.closure,
      updated: formatDate(item.updated_at),
    };
  });

  return { overview, assets, assessments, workflows };
}

function riskLevel(score: number) {
  return score >= 16 ? "High" : score >= 8 ? "Medium" : score > 0 ? "Low" : "Unknown";
}


export async function uploadAssessment(assetId: number, assessmentName: string, file: File) {
  const form = new FormData();
  form.append("asset_id", String(assetId));
  form.append("assessment_name", assessmentName);
  form.append("file", file);
  return apiRequest("/assessments/upload", { method: "POST", body: form });
}


export async function createAsset(
  asset: {
    name: string;
    asset_type: string;
    owner: string;
    business_purpose: string;
    environment: string;
    data_location: string;
    processors: string;
  },
  attachment?: File | null,
) {
  const form = new FormData();
  Object.entries(asset).forEach(([key, value]) => form.append(key, value));
  if (attachment) form.append("attachment", attachment);
  return apiRequest("/assets/intake", { method: "POST", body: form });
}


export async function loadRiskRegisterData() {
  const [rawRisks, rawAssets, rawAssessments, rawControls] = await Promise.all([
    apiRequest("/risks"),
    apiRequest("/assets"),
    apiRequest("/assessments"),
    apiRequest("/controls"),
  ]);

  const assetById = new Map(rawAssets.map((item: any) => [item.id, item]));
  const assessmentById = new Map(rawAssessments.map((item: any) => [item.id, item]));
  const controlById = new Map(rawControls.map((item: any) => [item.id, item]));

  return rawRisks.map((item: any) => {
    const asset = assetById.get(item.asset_id);
    const assessment = assessmentById.get(item.assessment_id);
    const controls = (item.mapped_control_ids || []).map((id: string) => {
      const control = controlById.get(id);
      return control ? {
        id,
        label: `${control.framework} ${control.reference} - ${control.title}`,
        framework: control.framework,
      } : { id, label: id, framework: "Unknown" };
    });
    return {
      id: item.risk_code || `PRIV-${item.id}`,
      dbId: item.id,
      title: item.title,
      asset: asset?.name || `Asset #${item.asset_id}`,
      assessment: assessment?.name || `Assessment #${item.assessment_id}`,
      classification: item.classification || assessment?.classification || "Unknown",
      likelihood: item.likelihood || "Unknown",
      impact: item.impact || "Unknown",
      score: item.inherent_score || 0,
      owner: item.owner || asset?.owner || "Unassigned",
      rationale: item.rationale || "Calculated from the linked assessment.",
      controls,
    };
  });
}

export async function requestRiskGuidance(riskId: number, question: string) {
  return apiRequest("/ai/guidance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context_type: "risk", context_id: String(riskId), question }),
  });
}


export async function updateWorkflow(workflowId: number, values: { remediation?: string; closure?: string }) {
  return apiRequest(`/workflows/${workflowId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
}

/* =========================================================
   REPORTS — LIVE DATA
   ========================================================= */

export async function loadReportsData() {
  const [
    overview,
    assets,
    assessments,
    risks,
    workflows,
    controls,
  ] = await Promise.all([
    apiRequest("/overview"),
    apiRequest("/assets"),
    apiRequest("/assessments"),
    apiRequest("/risks"),
    apiRequest("/workflows"),
    apiRequest("/controls"),
  ]);

  return {
    overview,
    assets,
    assessments,
    risks,
    workflows,
    controls,
  };
}

/* =========================================================
   REPORTS — AI EXECUTIVE SUMMARY
   Uses approved assessment metadata only.
   ========================================================= */

export async function requestAssessmentExecutiveSummary(
  assessmentId: number,
  question: string
) {
  return apiRequest("/ai/guidance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context_type: "assessment",
      context_id: String(assessmentId),
      question,
    }),
  });
}

/* =========================================================
   REPORTS — PERSISTED BACKEND REPORTS
   ========================================================= */

export async function loadPersistedReports() {
  return apiRequest("/reports");
}

export async function generatePersistedReport(values: {
  report_type: string;
  asset_id: number | null;
  frameworks: string[];
  include_workflow_status: boolean;
}) {
  return apiRequest("/reports/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
}

export async function loadReportPreview(reportId: number) {
  return apiRequest(`/reports/${reportId}/preview`);
}

export function getReportDownloadUrl(reportId: number) {
  return `${API_BASE}/reports/${reportId}/download`;
}

export async function requestReportExecutiveSummary(
  reportId: number,
  question: string
) {
  return apiRequest("/ai/guidance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context_type: "report",
      context_id: String(reportId),
      question,
    }),
  });
}

/* =========================================================
   AI ASSISTANT — LIVE WORKSPACE + GENERIC GUIDANCE
   ========================================================= */

export type AiContextType =
  | "risk"
  | "asset"
  | "assessment"
  | "control"
  | "report";

export async function loadAiAssistantData() {
  const [
    assets,
    assessments,
    risks,
    controls,
    reports,
    aiStatus,
  ] = await Promise.all([
    apiRequest("/assets"),
    apiRequest("/assessments"),
    apiRequest("/risks"),
    apiRequest("/controls"),
    apiRequest("/reports"),
    apiRequest("/ai/status"),
  ]);

  return {
    assets,
    assessments,
    risks,
    controls,
    reports,
    aiStatus,
  };
}

export async function requestAiGuidance(
  contextType: AiContextType,
  contextId: string | number,
  question: string
) {
  return apiRequest("/ai/guidance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      context_type: contextType,
      context_id: String(contextId),
      question,
    }),
  });
}
