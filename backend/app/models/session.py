from pydantic import BaseModel
from typing import Optional


class InitialForm(BaseModel):
    detection_datetime: str
    incident_types: list[str]
    entity_name: str
    entity_type: Optional[str] = None
    personal_data_involved: Optional[str] = None  # "yes" | "no" | "unknown"
    data_volume_estimate: Optional[str] = None
    people_volume_estimate: Optional[str] = None
    cross_border: Optional[str] = None
    csirt_severity: Optional[str] = None
    servicenow_ticket: Optional[str] = None
    description: str = ""


class QuestionAnswer(BaseModel):
    question_id: str
    value: str


class RoundHistory(BaseModel):
    round_number: int
    round_title: str
    questions_json: str
    answers: list[QuestionAnswer]


class SessionStartRequest(BaseModel):
    initial_form: InitialForm


class SessionContinueRequest(BaseModel):
    initial_form: InitialForm
    history: list[RoundHistory]
    current_answers: list[QuestionAnswer]


class LLMRoundResponse(BaseModel):
    done: bool
    raw_json: str


# === Incident persistence ===


class RegulationAnalysis(BaseModel):
    regulation: str  # "dora", "rgpd", "lopmi"
    analysis: str  # 3-4 paragraphs


class IncidentSaveRequest(BaseModel):
    initial_form: InitialForm
    rounds: list[RoundHistory]
    classification: dict
    incident_summary: str
    actions: list[dict]
    unknown_impacts: list[dict]
    analyses: dict  # {"dora": "...", "rgpd": "...", "lopmi": "..."}


class IncidentRecord(BaseModel):
    id: str
    created_at: str
    initial_form: InitialForm
    rounds: list[RoundHistory]
    classification: dict
    incident_summary: str
    actions: list[dict]
    unknown_impacts: list[dict]
    analyses: dict
    embeddings: dict = {}


class IncidentSummary(BaseModel):
    id: str
    created_at: str
    entity_name: str
    incident_types: list[str]
    global_level: str
    first_deadline_hours: Optional[int] = None
