import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000/api" });

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

export interface DeadlineAction {
  action: string;
  delay_hours: number | null;
  delay_label: string;
  regulation: string;
}

export interface RegulationResult {
  applicable: boolean;
  is_major: boolean;
  level: string;
  actions: DeadlineAction[];
  reasoning: string;
}

export interface ClassificationResult {
  dora: RegulationResult;
  rgpd: RegulationResult;
  lopmi: RegulationResult;
  global_level: string;
  first_deadline_hours: number | null;
}

export const classifyIncident = async (
  input: IncidentInput
): Promise<ClassificationResult> => {
  const { data } = await api.post<ClassificationResult>("/classify", input);
  return data;
};

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
