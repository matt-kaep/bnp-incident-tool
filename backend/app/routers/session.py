import asyncio
import json
import logging
from fastapi import APIRouter, HTTPException
from app.models.session import (
    SessionStartRequest, SessionContinueRequest, LLMRoundResponse
)
from app.services import llm_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/session/start", response_model=LLMRoundResponse)
async def session_start(req: SessionStartRequest):
    try:
        result = await asyncio.to_thread(
            llm_service.start_session, req.initial_form.model_dump()
        )
        return LLMRoundResponse(done=result["done"], raw_json=result["raw_json"])
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="LLM a retourné du JSON invalide.")
    except Exception:
        logger.exception("Erreur session/start")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")


@router.post("/session/continue", response_model=LLMRoundResponse)
async def session_continue(req: SessionContinueRequest):
    try:
        history = [h.model_dump() for h in req.history]
        answers = [a.model_dump() for a in req.current_answers]
        result = await asyncio.to_thread(
            llm_service.continue_session, req.initial_form.model_dump(), history, answers
        )
        return LLMRoundResponse(done=result["done"], raw_json=result["raw_json"])
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="LLM a retourné du JSON invalide.")
    except Exception:
        logger.exception("Erreur session/continue")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")
