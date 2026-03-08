from pydantic import BaseModel
from typing import Optional


class InitialForm(BaseModel):
    detection_datetime: str
    incident_types: list[str]
    entity_name: str
    entity_type: Optional[str] = None
    personal_data_involved: Optional[str] = None  # "yes" | "no" | "unknown"
    data_volume_estimate: Optional[str] = None
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


class SessionRefineRequest(BaseModel):
    classification_json: str
    incident_description: str


class LLMRoundResponse(BaseModel):
    done: bool
    raw_json: str
