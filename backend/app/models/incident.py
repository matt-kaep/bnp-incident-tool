from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class IncidentType(str, Enum):
    CYBER = "cyber"
    OPERATIONAL = "operational"
    PAYMENT = "payment"


class PrimaryCriterion(str, Enum):
    CRITICAL_FUNCTIONS = "critical_functions"
    SUPERVISED_FINANCIAL = "supervised_financial"
    MALICIOUS_ACCESS = "malicious_access"


class MaterialityThreshold(str, Enum):
    CLIENTS = "clients"
    REPUTATIONAL = "reputational"
    DURATION = "duration"
    GEOGRAPHIC = "geographic"
    ECONOMIC = "economic"
    DATA_LOSS = "data_loss"


class IncidentInput(BaseModel):
    detection_datetime: datetime
    incident_type: IncidentType
    personal_data_involved: bool
    primary_criteria: list[PrimaryCriterion] = []
    materiality_thresholds: list[MaterialityThreshold] = []
    is_recurring: bool = False
    # RGPD
    rgpd_q1_is_personal_breach: bool | None = None
    rgpd_q2_risk_rights: bool | None = None
    rgpd_q3_high_risk: bool | None = None
    rgpd_q4_exemption: bool | None = None
    # LOPMI
    lopmi_intrusion_confirmed: bool | None = None
    # Contexte libre
    description: str = ""


class DeadlineAction(BaseModel):
    action: str
    delay_hours: int | None = None
    delay_label: str
    regulation: str


class RegulationResult(BaseModel):
    applicable: bool
    is_major: bool = False
    level: str = "none"  # "major", "significant", "minor", "none"
    actions: list[DeadlineAction] = []
    reasoning: str = ""


class ClassificationResult(BaseModel):
    dora: RegulationResult
    rgpd: RegulationResult
    lopmi: RegulationResult
    global_level: str  # "major", "significant", "minor", "none"
    first_deadline_hours: int | None
