import json
from fastapi import APIRouter, HTTPException
from app.models.session import (
    SessionStartRequest, SessionContinueRequest, SessionRefineRequest, LLMRoundResponse
)
from app.services import llm_service
from app.services.rag_service import get_rag_service

router = APIRouter()


@router.post("/session/start", response_model=LLMRoundResponse)
async def session_start(req: SessionStartRequest):
    try:
        result = llm_service.start_session(req.initial_form.model_dump())
        return LLMRoundResponse(done=result["done"], raw_json=result["raw_json"])
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"LLM a retourné du JSON invalide : {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/continue", response_model=LLMRoundResponse)
async def session_continue(req: SessionContinueRequest):
    try:
        history = [h.model_dump() for h in req.history]
        answers = [a.model_dump() for a in req.current_answers]
        result = llm_service.continue_session(req.initial_form.model_dump(), history, answers)
        return LLMRoundResponse(done=result["done"], raw_json=result["raw_json"])
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"LLM a retourné du JSON invalide : {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/refine")
async def session_refine(req: SessionRefineRequest):
    try:
        rag = get_rag_service()
        rag_result = rag.query(req.incident_description, k=5)
        excerpts = [s.get("excerpt", "") for s in rag_result.get("sources", [])]
        narrative = llm_service.refine_with_rag(req.classification_json, excerpts)
        return {"narrative": narrative}
    except RuntimeError as e:
        # RAG index non disponible — retourner erreur claire
        raise HTTPException(status_code=503, detail=f"Service RAG non disponible : {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
