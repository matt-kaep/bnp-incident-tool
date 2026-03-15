import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

logger = logging.getLogger(__name__)

router = APIRouter()

DOCS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "docs"


@router.get("/docs/{filename}")
async def get_document(filename: str):
    """Serve a regulatory PDF document."""
    # Path traversal protection
    safe_name = Path(filename).name
    if safe_name != filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Nom de fichier invalide.")

    file_path = DOCS_DIR / safe_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Document non trouvé.")

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=safe_name,
    )
