# RAG Citations with PDF Preview — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline clickable source citations to RAG analyses that open a PDF preview modal with page navigation and text highlighting.

**Architecture:** Backend passes full RAG source metadata (file, page, excerpt) to the LLM prompt with citation instructions. The LLM inserts `[REF:file:page:"quote"]` markers. Frontend parses these into clickable badges that open a `react-pdf` modal at the correct page with highlighted text.

**Tech Stack:** react-pdf (pdf.js wrapper), FastAPI FileResponse, Anthropic Claude API

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/app/services/llm_service.py` | Modify | Accept source dicts instead of excerpt strings, add citation instructions to prompt |
| `backend/app/routers/analysis.py` | Modify | Pass full source dicts to LLM, return sources in response |
| `backend/app/routers/docs.py` | Create | Serve PDF files from `data/docs/` |
| `backend/app/main.py` | Modify | Register docs router |
| `frontend/src/lib/citationParser.ts` | Create | Parse `[REF:...]` markers into structured segments |
| `frontend/src/lib/pdfSetup.ts` | Create | Configure pdf.js worker |
| `frontend/src/lib/api.ts` | Modify | Update `RegulationAnalysis` type to include sources |
| `frontend/src/components/results/PdfPreviewModal.tsx` | Create | Modal PDF viewer with page nav + text highlight |
| `frontend/src/components/results/RegulationAnalysisBlock.tsx` | Modify | Render parsed analysis with citation badges |

---

### Task 1: Backend — PDF serving endpoint

**Files:**
- Create: `backend/app/routers/docs.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create docs router**

Create `backend/app/routers/docs.py`:

```python
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

router = APIRouter()

DOCS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "docs"


@router.get("/docs/{filename}")
async def get_document(filename: str):
    safe_name = Path(filename).name
    if safe_name != filename:
        raise HTTPException(status_code=400, detail="Nom de fichier invalide")
    file_path = DOCS_DIR / safe_name
    if not file_path.exists() or file_path.suffix.lower() != ".pdf":
        raise HTTPException(status_code=404, detail="Document non trouvé")
    return FileResponse(
        file_path,
        media_type="application/pdf",
        headers={"Cache-Control": "public, max-age=86400"},
    )
```

- [ ] **Step 2: Register docs router in main.py**

In `backend/app/main.py`, add the import and include:

```python
from app.routers import session, rag, incidents, analysis, docs

# Add after existing router registrations:
app.include_router(docs.router, prefix="/api")
```

- [ ] **Step 3: Test manually**

Run: `curl -I http://localhost:8000/api/docs/LOPMI.pdf`
Expected: `200 OK` with `content-type: application/pdf`

Run: `curl -I http://localhost:8000/api/docs/../../etc/passwd`
Expected: `400` or `404`

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/docs.py backend/app/main.py
git commit -m "feat: add PDF serving endpoint with path sanitization"
```

---

### Task 2: Backend — Pass source metadata to LLM + citation prompt

**Files:**
- Modify: `backend/app/services/llm_service.py`
- Modify: `backend/app/routers/analysis.py`

- [ ] **Step 1: Update `generate_regulation_analysis` signature and prompt**

In `backend/app/services/llm_service.py`, change the function to accept full source dicts and add citation instructions:

```python
def generate_regulation_analysis(
    regulation: str,
    classification_json: str,
    incident_summary: str,
    rag_sources: list[dict],
) -> str:
    """Generate a detailed 3-4 paragraph analysis for a specific regulation using RAG excerpts."""
    reg_names = {
        "dora": "DORA (Règlement UE 2022/2554)",
        "rgpd": "RGPD (Règlement UE 2016/679, Articles 33-34)",
        "lopmi": "LOPMI (Code des assurances, Art. L12-10-1)",
    }
    reg_label = reg_names.get(regulation, regulation.upper())

    excerpts_text = "\n\n---\n\n".join(
        f"Extrait réglementaire ({i+1}) [source: {src['source']}, page {src['page']}] :\n{src['excerpt']}"
        for i, src in enumerate(rag_sources)
    )

    user_message = f"""CLASSIFICATION DE L'INCIDENT :
{classification_json}

RÉSUMÉ DE L'INCIDENT :
{incident_summary}

EXTRAITS DU TEXTE RÉGLEMENTAIRE {reg_label} :
{excerpts_text}

Rédige une analyse détaillée (3-4 paragraphes) expliquant pourquoi et comment la réglementation {reg_label} s'applique (ou ne s'applique pas) à cet incident. Ton juridique professionnel, en français.

CITATIONS OBLIGATOIRES : Quand tu cites ou te réfères à un extrait fourni, insère une balise de référence dans ton texte avec ce format exact :
[REF:nom_du_fichier.pdf:numéro_de_page:"citation courte de 5-15 mots extraite du passage"]
Exemple : [REF:DORA-CELEX_32022R2554_EN_TXT.pdf:23:"entities shall implement ICT risk management"]
Insère au moins une référence par paragraphe. La citation entre guillemets doit être un extrait EXACT du passage source.

Retourne UNIQUEMENT le texte de l'analyse avec les balises [REF:...] intégrées (pas de JSON, pas de titre)."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=f"Tu es un expert juridique BNP Paribas spécialisé en {reg_label}. Tu rédiges des analyses réglementaires détaillées avec citations d'articles. Tu utilises les balises [REF:fichier:page:\"citation\"] pour référencer tes sources.",
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text.strip()
```

- [ ] **Step 2: Update analysis router to pass full sources and return them**

In `backend/app/routers/analysis.py`, update the response model and handler:

```python
class AnalysisResponse(BaseModel):
    regulation: str
    analysis: str
    sources: list[dict] = []


@router.post("/analysis/{regulation}", response_model=AnalysisResponse)
async def analyze_regulation(regulation: str, req: AnalysisRequest):
    if regulation not in ("dora", "rgpd", "lopmi"):
        raise HTTPException(status_code=400, detail=f"Réglementation inconnue: {regulation}")

    try:
        rag = get_rag_service()
        search_query = f"{regulation.upper()} {req.incident_summary[:500]}"
        rag_result = await asyncio.to_thread(rag.query, search_query, 5)
        sources = rag_result.get("sources", [])

        analysis = await asyncio.to_thread(
            llm_service.generate_regulation_analysis,
            regulation=regulation,
            classification_json=req.classification_json,
            incident_summary=req.incident_summary,
            rag_sources=sources,
        )
        return AnalysisResponse(regulation=regulation, analysis=analysis, sources=sources)
    except RuntimeError:
        logger.exception("RAG service unavailable")
        raise HTTPException(status_code=503, detail="Service RAG non disponible.")
    except Exception:
        logger.exception("Erreur analysis/%s", regulation)
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")
```

- [ ] **Step 3: Verify backend compiles**

Run: `cd backend && source .venv/bin/activate && python -c "from app.main import app; print('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/llm_service.py backend/app/routers/analysis.py
git commit -m "feat: pass RAG source metadata to LLM with citation instructions"
```

---

### Task 3: Frontend — Citation parser

**Files:**
- Create: `frontend/src/lib/citationParser.ts`

- [ ] **Step 1: Create citation parser**

Create `frontend/src/lib/citationParser.ts`:

```typescript
export type TextSegment = { type: "text"; content: string };
export type RefSegment = {
  type: "ref";
  file: string;
  page: number;
  quote: string;
};
export type AnalysisSegment = TextSegment | RefSegment;

const REF_REGEX = /\[REF:([^:]+):(\d+):"([^"]+)"\]/g;

export function parseAnalysisText(text: string): AnalysisSegment[] {
  const segments: AnalysisSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(REF_REGEX)) {
    const matchStart = match.index!;

    // Text before this match
    if (matchStart > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, matchStart) });
    }

    segments.push({
      type: "ref",
      file: match[1],
      page: parseInt(match[2], 10),
      quote: match[3],
    });

    lastIndex = matchStart + match[0].length;
  }

  // Remaining text after last match
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  // Fallback: if no refs found, return whole text as single segment
  if (segments.length === 0) {
    segments.push({ type: "text", content: text });
  }

  return segments;
}

/** Maps a source filename to a short display label */
export function sourceLabel(filename: string): string {
  if (filename.includes("DORA")) return "DORA";
  if (filename.includes("RGPD")) return "RGPD";
  if (filename.includes("LOPMI")) return "LOPMI";
  return filename.replace(/\.pdf$/i, "");
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/citationParser.ts
git commit -m "feat: add citation parser for [REF:...] markers"
```

---

### Task 4: Frontend — PDF preview modal

**Files:**
- Create: `frontend/src/lib/pdfSetup.ts`
- Create: `frontend/src/components/results/PdfPreviewModal.tsx`

- [ ] **Step 1: Install react-pdf**

Run: `cd frontend && npm install react-pdf`

- [ ] **Step 2: Create pdf.js worker setup**

Create `frontend/src/lib/pdfSetup.ts`:

```typescript
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

- [ ] **Step 3: Create PdfPreviewModal component**

Create `frontend/src/components/results/PdfPreviewModal.tsx`:

```tsx
import { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "../../../src/lib/pdfSetup";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  initialPage: number;
  highlightText: string;
  title: string;
}

export default function PdfPreviewModal({
  isOpen,
  onClose,
  fileUrl,
  initialPage,
  highlightText,
  title,
}: Props) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageNumber(initialPage);
  }, [initialPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setPageNumber((p) => Math.max(1, p - 1));
      if (e.key === "ArrowRight")
        setPageNumber((p) => Math.min(numPages, p + 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, numPages, onClose]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: total }: { numPages: number }) => {
      setNumPages(total);
      setPageNumber(Math.min(initialPage, total));
      setLoading(false);
      setError(null);
    },
    [initialPage]
  );

  const onDocumentLoadError = useCallback(() => {
    setLoading(false);
    setError("Impossible de charger le document.");
  }, []);

  const onRenderTextLayerSuccess = useCallback(() => {
    if (!highlightText || !pageRef.current) return;

    const textLayer = pageRef.current.querySelector(
      ".react-pdf__Page__textContent"
    );
    if (!textLayer) return;

    const spans = textLayer.querySelectorAll("span");
    let fullText = "";
    const charMap: { span: HTMLSpanElement; startIdx: number }[] = [];

    spans.forEach((span) => {
      charMap.push({ span, startIdx: fullText.length });
      fullText += span.textContent || "";
    });

    const normalizedSearch = highlightText.replace(/\s+/g, " ").trim().toLowerCase();
    const normalizedFull = fullText.replace(/\s+/g, " ").toLowerCase();
    const matchIdx = normalizedFull.indexOf(normalizedSearch);

    if (matchIdx === -1) return;

    const matchEnd = matchIdx + normalizedSearch.length;
    let firstHighlighted: HTMLSpanElement | null = null;

    charMap.forEach(({ span, startIdx }) => {
      const spanText = span.textContent || "";
      const spanEnd = startIdx + spanText.length;
      if (startIdx < matchEnd && spanEnd > matchIdx) {
        span.style.backgroundColor = "rgba(250, 204, 21, 0.5)";
        span.style.borderRadius = "2px";
        if (!firstHighlighted) firstHighlighted = span;
      }
    });

    if (firstHighlighted) {
      (firstHighlighted as HTMLSpanElement).scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightText]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-4 z-50 flex flex-col bg-white rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50 shrink-0">
          <h2 className="text-sm font-semibold text-gray-800 truncate">
            {title}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-40 hover:bg-gray-300"
              >
                &larr;
              </button>
              <span className="text-xs text-gray-600">
                {pageNumber} / {numPages}
              </span>
              <button
                onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
                className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-40 hover:bg-gray-300"
              >
                &rarr;
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded text-gray-500"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto p-4 flex justify-center bg-gray-100">
          {error ? (
            <div className="text-red-500 text-sm self-center">{error}</div>
          ) : (
            <div ref={pageRef}>
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="text-gray-500 text-sm">
                    Chargement du document...
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  width={800}
                  renderTextLayer={true}
                  renderAnnotationLayer={false}
                  onRenderTextLayerSuccess={onRenderTextLayerSuccess}
                  loading={
                    <div className="text-gray-400 text-xs">
                      Rendu de la page...
                    </div>
                  }
                />
              </Document>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/pdfSetup.ts frontend/src/components/results/PdfPreviewModal.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat: add PDF preview modal with page nav and text highlighting"
```

---

### Task 5: Frontend — Update API types

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Update RegulationAnalysis type**

In `frontend/src/lib/api.ts`, update the `RegulationAnalysis` interface:

```typescript
export interface RegulationAnalysis {
  regulation: string;
  analysis: string;
  sources: Array<{ source: string; page: string; excerpt: string }>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: update RegulationAnalysis type with sources"
```

---

### Task 6: Frontend — Wire citations into RegulationAnalysisBlock

**Files:**
- Modify: `frontend/src/components/results/RegulationAnalysisBlock.tsx`

- [ ] **Step 1: Rewrite RegulationAnalysisBlock to render parsed citations**

Replace the content of `RegulationAnalysisBlock.tsx` with:

```tsx
import { useState } from "react";
import type { RegulationAnalysis } from "../../lib/api";
import { parseAnalysisText, sourceLabel } from "../../lib/citationParser";
import PdfPreviewModal from "./PdfPreviewModal";

interface Props {
  regulation: string;
  analysis: RegulationAnalysis | null;
  isLoading: boolean;
  error: string | null;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function RegulationAnalysisBlock({
  regulation,
  analysis,
  isLoading,
  error,
}: Props) {
  const [pdfModal, setPdfModal] = useState<{
    fileUrl: string;
    page: number;
    highlightText: string;
    title: string;
  } | null>(null);

  if (!isLoading && !analysis && !error) return null;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-3">
          Analyse {regulation}
        </h3>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          Analyse en cours — enrichissement avec les textes réglementaires...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-3">
          Analyse {regulation}
        </h3>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!analysis) return null;

  const segments = parseAnalysisText(analysis.analysis);

  return (
    <>
      <div className="bg-white rounded-lg border p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-3">
          Analyse {regulation}
        </h3>
        <div className="text-sm text-gray-700 leading-relaxed">
          {segments.map((seg, i) =>
            seg.type === "text" ? (
              <span key={i} className="whitespace-pre-wrap">
                {seg.content}
              </span>
            ) : (
              <button
                key={i}
                onClick={() =>
                  setPdfModal({
                    fileUrl: `${API_BASE}/docs/${seg.file}`,
                    page: seg.page,
                    highlightText: seg.quote,
                    title: `${sourceLabel(seg.file)} — Page ${seg.page}`,
                  })
                }
                className="inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition-colors border border-blue-200"
                title={seg.quote}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {sourceLabel(seg.file)} p.{seg.page}
              </button>
            )
          )}
        </div>
      </div>

      {pdfModal && (
        <PdfPreviewModal
          isOpen={true}
          onClose={() => setPdfModal(null)}
          fileUrl={pdfModal.fileUrl}
          initialPage={pdfModal.page}
          highlightText={pdfModal.highlightText}
          title={pdfModal.title}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/results/RegulationAnalysisBlock.tsx
git commit -m "feat: render citation badges with PDF preview modal in analysis"
```

---

### Task 7: Verify full build + smoke test

- [ ] **Step 1: Backend compilation check**

Run: `cd backend && source .venv/bin/activate && python -c "from app.main import app; print('OK')"`
Expected: `OK`

- [ ] **Step 2: Frontend TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Manual smoke test**

1. Start backend: `cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000`
2. Start frontend: `cd frontend && npm run dev`
3. Complete an incident session through to classification
4. Verify analyses contain `📄 DORA p.XX` badges inline
5. Click a badge → PDF modal opens at correct page
6. Verify highlighted text visible on the page
7. Test page navigation (arrows + keyboard)
8. Test Escape to close modal
9. Test that analyses without `[REF:]` markers still display correctly (fallback)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete RAG citations with PDF preview modal"
```
