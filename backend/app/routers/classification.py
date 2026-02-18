from fastapi import APIRouter
from app.models.incident import IncidentInput, ClassificationResult
from app.services.classifier import classify_incident

router = APIRouter()


@router.post("/classify", response_model=ClassificationResult)
async def classify(incident: IncidentInput) -> ClassificationResult:
    return classify_incident(incident)
