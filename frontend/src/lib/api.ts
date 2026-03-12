import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000/api" });

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
  narrative: string;
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

export const sessionRefine = async (
  classification_json: string,
  incident_description: string
): Promise<{ narrative: string }> => {
  const { data } = await api.post("/session/refine", {
    classification_json,
    incident_description,
  });
  return data;
};

// === V1 COMPATIBILITY — wizard components (obsolètes, ne pas modifier) ===

/** @deprecated V1 — utiliser InitialForm */
export interface IncidentInput {
  detection_datetime: string;
  incident_type: "cyber" | "operational" | "payment";
  personal_data_involved: boolean;
  primary_criteria: string[];
  materiality_thresholds: string[];
  is_recurring: boolean;
  rgpd_q1_is_personal_breach?: boolean | null;
  rgpd_q2_risk_rights?: boolean | null;
  rgpd_q3_high_risk?: boolean | null;
  rgpd_q4_exemption?: boolean | null;
  lopmi_intrusion_confirmed?: boolean | null;
  description: string;
}

/** @deprecated V1 — utiliser RegulationClassification */
export interface RegulationResult {
  applicable: boolean;
  is_major: boolean;
  level: string;
  actions: DeadlineAction[];
  reasoning: string;
}

/** @deprecated V1 */
export interface DeadlineAction {
  action: string;
  delay_hours: number | null;
  delay_label: string;
  regulation: string;
}

/** @deprecated V1 — utiliser ClassificationData */
export interface ClassificationResult {
  dora: RegulationResult;
  rgpd: RegulationResult;
  lopmi: RegulationResult;
  global_level: string;
  first_deadline_hours: number | null;
}

/** @deprecated V1 — utiliser sessionStart/sessionContinue */
export const classifyIncident = async (
  input: IncidentInput
): Promise<ClassificationResult> => {
  const { data } = await api.post<ClassificationResult>("/classify", input);
  return data;
};

// RAG chatbot — conservé
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
