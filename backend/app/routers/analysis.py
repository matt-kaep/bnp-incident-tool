import asyncio
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services import llm_service
from app.services.rag_service import get_rag_service

logger = logging.getLogger(__name__)

router = APIRouter()


class AnalysisRequest(BaseModel):
    classification_json: str
    incident_summary: str


class SourceReference(BaseModel):
    source: str
    page: str
    excerpt: str


class AnalysisResponse(BaseModel):
    regulation: str
    analysis: str
    sources: list[SourceReference]


@router.post("/analysis/{regulation}", response_model=AnalysisResponse)
async def analyze_regulation(regulation: str, req: AnalysisRequest):
    if regulation not in ("dora", "rgpd", "lopmi"):
        raise HTTPException(status_code=400, detail=f"Réglementation inconnue: {regulation}")

    try:
        rag = get_rag_service()
        search_query = f"{regulation.upper()} {req.incident_summary[:500]}"
        rag_result = rag.query(search_query, k=5)
        sources = rag_result.get("sources", [])

        analysis = await asyncio.to_thread(
            llm_service.generate_regulation_analysis,
            regulation=regulation,
            classification_json=req.classification_json,
            incident_summary=req.incident_summary,
            rag_excerpts=sources,
        )
        return AnalysisResponse(
            regulation=regulation,
            analysis=analysis,
            sources=[SourceReference(**s) for s in sources],
        )
    except RuntimeError:
        logger.exception("RAG service unavailable")
        raise HTTPException(status_code=503, detail="Service RAG non disponible.")
    except Exception:
        logger.exception("Erreur analysis/%s", regulation)
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")
