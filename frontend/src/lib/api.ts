import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  timeout: 120000,
});

// === FORMULAIRE INITIAL ===

export interface InitialForm {
  detection_datetime: string;
  incident_types: string[];
  entity_name: string;
  entity_type?: string;
  personal_data_involved?: "yes" | "no" | "unknown";
  data_volume_estimate?: string;
  people_volume_estimate?: string;
  cross_border?: "yes" | "no" | "unknown";
  csirt_severity?: "low" | "moderate" | "serious" | "extreme";
  servicenow_ticket?: string;
  description: string;
}

// === QUESTIONS DYNAMIQUES ===

export interface DynamicQuestion {
  id: string;
  text: string;
  type: "yes_no_unknown" | "multi_select" | "text";
  options: string[] | null;
  importance: "critical" | "important" | "optional";
  if_unknown_impact: string | null;
}

export interface QuestionRoundData {
  done: false;
  round_title: string;
  questions: DynamicQuestion[];
}

export interface QuestionAnswer {
  question_id: string;
  value: string;
}

export interface RoundHistory {
  round_number: number;
  round_title: string;
  questions_json: string;
  answers: QuestionAnswer[];
}

// === CLASSIFICATION FINALE ===

export interface RegulationClassification {
  level: string;
  applicable: boolean;
  reasoning: string;
}

export interface ActionItem {
  regulation: string;
  action: string;
  deadline_hours: number | null;
  deadline_label: string;
  done: boolean;
}

export interface UnknownImpact {
  field: string;
  impact: string;
  action_required: string;
}

export interface ClassificationData {
  done: true;
  classification: {
    global_level: string;
    dora: RegulationClassification;
    rgpd: RegulationClassification;
    lopmi: RegulationClassification;
  };
  actions: ActionItem[];
  first_deadline_hours: number | null;
  unknown_impacts: UnknownImpact[];
  incident_summary: string;
}

// === API CALLS ===

export const sessionStart = async (
  initial_form: InitialForm
): Promise<{ done: boolean; raw_json: string }> => {
  const { data } = await api.post("/session/start", { initial_form });
  return data;
};

export const sessionContinue = async (
  initial_form: InitialForm,
  history: RoundHistory[],
  current_answers: QuestionAnswer[]
): Promise<{ done: boolean; raw_json: string }> => {
  const { data } = await api.post("/session/continue", {
    initial_form,
    history,
    current_answers,
  });
  return data;
};

// === REGULATION ANALYSIS (RAG-enriched) ===

export interface SourceReference {
  source: string;
  page: string;
  excerpt: string;
}

export interface RegulationAnalysis {
  regulation: string;
  analysis: string;
  sources: SourceReference[];
}

export const analyzeRegulation = async (
  regulation: "dora" | "rgpd" | "lopmi",
  classification_json: string,
  incident_summary: string
): Promise<RegulationAnalysis> => {
  const { data } = await api.post(`/analysis/${regulation}`, {
    classification_json,
    incident_summary,
  });
  return data;
};

// === INCIDENT PERSISTENCE ===

export interface IncidentSummaryItem {
  id: string;
  created_at: string;
  entity_name: string;
  incident_types: string[];
  global_level: string;
  first_deadline_hours: number | null;
}

export interface IncidentRecord {
  id: string;
  created_at: string;
  initial_form: InitialForm;
  rounds: RoundHistory[];
  classification: ClassificationData["classification"];
  incident_summary: string;
  actions: ActionItem[];
  unknown_impacts: UnknownImpact[];
  analyses: Record<string, string>;
}

export interface SimilarIncident {
  id: string;
  created_at: string;
  entity_name: string;
  incident_types: string[];
  global_level: string;
  incident_summary: string;
  similarity: number;
}

export const saveIncident = async (
  incidentData: Record<string, unknown>
): Promise<IncidentRecord> => {
  const { data } = await api.post("/incidents", incidentData);
  return data;
};

export const listIncidents = async (): Promise<IncidentSummaryItem[]> => {
  const { data } = await api.get("/incidents");
  return data;
};

export const getIncident = async (id: string): Promise<IncidentRecord> => {
  const { data } = await api.get(`/incidents/${id}`);
  return data;
};

export const deleteIncident = async (id: string): Promise<void> => {
  await api.delete(`/incidents/${id}`);
};

export const findSimilarIncidents = async (
  incident_summary: string,
  exclude_id?: string
): Promise<SimilarIncident[]> => {
  const { data } = await api.post("/incidents/similar", {
    incident_summary,
    exclude_id,
  });
  return data;
};

// === RAG CHATBOT ===

export interface ChatSource {
  source: string;
  page: string;
  excerpt?: string;
}

export const chatWithAgent = async (
  question: string,
  incidentContext: string = ""
): Promise<{ answer: string; sources: ChatSource[] }> => {
  const { data } = await api.post("/chat", {
    question,
    incident_context: incidentContext,
  });
  return data;
};
