// @ts-nocheck
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001/api";

export async function apiRequest(path: string, options: RequestInit = {}) {
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
