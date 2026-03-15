#!/usr/bin/env python3
"""Reset ChromaDB and reindex the 3 regulatory PDFs (DORA, RGPD, LOPMI)."""

import os
import shutil
import sys
from pathlib import Path

# Add backend root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

DOCS_SOURCE = Path(os.getenv(
    "DOCS_SOURCE_PATH",
    "/Users/matthieu.kaeppelin/Documents/3-Cours/Master DS - X/Capstone/Capstone_documentation/Reglementations applicables"
))
DOCS_TARGET = Path("data/docs")
CHROMA_PATH = Path("data/chroma_db")


def main():
    # 1. Clear existing ChromaDB
    if CHROMA_PATH.exists():
        shutil.rmtree(CHROMA_PATH)
        print(f"Cleared {CHROMA_PATH}")

    # 2. Clear and copy PDFs to data/docs
    if DOCS_TARGET.exists():
        shutil.rmtree(DOCS_TARGET)
    DOCS_TARGET.mkdir(parents=True, exist_ok=True)

    pdfs = list(DOCS_SOURCE.glob("*.pdf"))
    if not pdfs:
        print(f"ERROR: No PDFs found in {DOCS_SOURCE}")
        return

    for pdf in pdfs:
        target = DOCS_TARGET / pdf.name
        shutil.copy2(pdf, target)
        print(f"Copied {pdf.name}")

    # 3. Reindex
    from app.services.rag_service import RagService
    service = RagService(docs_path=str(DOCS_TARGET), persist_path=str(CHROMA_PATH))
    service.index_documents()
    print(f"Indexed {len(pdfs)} PDFs into {CHROMA_PATH}")


if __name__ == "__main__":
    main()
