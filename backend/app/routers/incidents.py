import asyncio
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.services import incident_store
from app.services.rag_service import get_rag_service
from app.models.session import IncidentSaveRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/incidents")
async def list_all():
    return await asyncio.to_thread(incident_store.list_incidents)


@router.get("/incidents/{incident_id}")
async def get_one(incident_id: str):
    record = await asyncio.to_thread(incident_store.get_incident, incident_id)
    if not record:
        raise HTTPException(status_code=404, detail="Incident non trouvé")
    return record


@router.post("/incidents")
async def save(body: IncidentSaveRequest):
    try:
        rag = get_rag_service()
        incident_data = body.model_dump()
        embeddings = {}
        summary_text = incident_data.get("incident_summary", "")
        if summary_text:
            embeddings["incident_summary"] = await asyncio.to_thread(rag.embed_text, summary_text)
        analyses = incident_data.get("analyses", {})
        for reg in ["dora", "rgpd", "lopmi"]:
            text = analyses.get(reg, "")
            if text:
                embeddings[f"{reg}_analysis"] = await asyncio.to_thread(rag.embed_text, text)
        record = await asyncio.to_thread(incident_store.save_incident, incident_data, embeddings)
        record.pop("embeddings", None)
        return record
    except Exception:
        logger.exception("Erreur sauvegarde incident")
        raise HTTPException(status_code=500, detail="Erreur lors de la sauvegarde.")


@router.delete("/incidents/{incident_id}")
async def delete_one(incident_id: str):
    deleted = await asyncio.to_thread(incident_store.delete_incident, incident_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Incident non trouvé")
    return {"ok": True}


class UpdateNotesRequest(BaseModel):
    notes: str = Field(max_length=10000)


@router.patch("/incidents/{incident_id}/notes")
async def update_notes(incident_id: str, body: UpdateNotesRequest):
    try:
        updated = await asyncio.to_thread(
            incident_store.update_incident_notes, incident_id, body.notes
        )
    except Exception:
        logger.exception("Erreur mise à jour notes incident")
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour des notes.")
    if not updated:
        raise HTTPException(status_code=404, detail="Incident non trouvé")
    return updated


class SimilarRequest(BaseModel):
    incident_summary: str
    exclude_id: Optional[str] = None


@router.post("/incidents/similar")
async def find_similar_endpoint(body: SimilarRequest):
    try:
        rag = get_rag_service()
        if not body.incident_summary:
            return []
        embedding = await asyncio.to_thread(rag.embed_text, body.incident_summary)
        return await asyncio.to_thread(
            incident_store.find_similar, embedding, 5, body.exclude_id
        )
    except Exception:
        logger.exception("Erreur recherche similaire")
        raise HTTPException(status_code=500, detail="Erreur lors de la recherche.")
