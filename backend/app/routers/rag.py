import asyncio
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.services.rag_service import get_rag_service, RagService

router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    incident_context: str = ""


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    rag: RagService = Depends(get_rag_service),
) -> ChatResponse:
    query = request.question
    if request.incident_context:
        query = f"Contexte incident: {request.incident_context}\n\nQuestion: {request.question}"
    result = await asyncio.to_thread(rag.query, query)
    return ChatResponse(answer=result["answer"], sources=result["sources"])
