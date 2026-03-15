# Citations RAG avec Preview PDF — Design Spec

## Goal

Add inline source citations to RAG-generated regulation analyses, with clickable badges that open a PDF preview modal scrolled to the correct page with the cited text highlighted.

## Context

The app generates regulatory analyses (DORA, RGPD, LOPMI) using RAG excerpts from ChromaDB + Claude LLM. Currently the analysis text is plain — no references to source documents. The RAG service already returns `{source: filename, page: number, excerpt: text}` per chunk, but this metadata is discarded before reaching the LLM.

### PDF files in `data/docs/`
- `DORA-CELEX_32022R2554_EN_TXT.pdf`
- `RGPD-CELEX_32016R0679_EN_TXT.pdf`
- `LOPMI.pdf`

## Architecture

Three layers modified:

### 1. Backend — Prompt & Response Changes

**`llm_service.py` — `generate_regulation_analysis()`**

Currently receives `rag_excerpts: list[str]` (just text). Change to receive full source metadata:

```python
def generate_regulation_analysis(
    regulation: str,
    classification_json: str,
    incident_summary: str,
    rag_sources: list[dict],  # [{source, page, excerpt}]
) -> str:
```

Prompt modification — each excerpt is labeled with its source metadata:

```
Extrait réglementaire (1) [source: DORA-CELEX_32022R2554_EN_TXT.pdf, page 23]:
"le responsable du traitement notifie la violation..."

Extrait réglementaire (2) [source: RGPD-CELEX_32016R0679_EN_TXT.pdf, page 12]:
"financial entities shall implement ICT risk management..."
```

Add instruction to LLM prompt:

```
CITATIONS OBLIGATOIRES : Quand tu cites ou te réfères à un extrait fourni, insère une balise de référence dans ton texte avec ce format exact :
[REF:nom_du_fichier.pdf:numéro_de_page:"citation courte de 5-15 mots"]
Exemple : [REF:DORA-CELEX_32022R2554_EN_TXT.pdf:23:"entities shall implement ICT risk management"]
Insère au moins une référence par paragraphe. La citation doit être un extrait EXACT du passage cité.
```

**`analysis.py` — Response enrichment**

Return sources alongside analysis text:

```python
class AnalysisResponse(BaseModel):
    regulation: str
    analysis: str
    sources: list[dict]  # [{source, page, excerpt}] for fallback/metadata
```

**`main.py` — New endpoint for serving PDFs**

```python
@app.get("/api/docs/{filename}")
```

Serves PDFs from `data/docs/` with path traversal sanitization. Returns `FileResponse` with `application/pdf` content type.

### 2. Frontend — Parsing & Rendering

**`lib/citationParser.ts` (new)**

Parses analysis text containing `[REF:...]` markers into structured segments:

```typescript
type TextSegment = { type: "text"; content: string };
type RefSegment = { type: "ref"; file: string; page: number; quote: string };
type AnalysisSegment = TextSegment | RefSegment;

function parseAnalysisText(text: string): AnalysisSegment[];
```

Regex: `/\[REF:([^:]+):(\d+):"([^"]+)"\]/g`

Fallback: if no `[REF:...]` found, return the whole text as a single text segment (preserves current behavior).

**`RegulationAnalysisBlock.tsx` (modified)**

Instead of rendering `analysis.analysis` as plain text, parse it and render:
- Text segments as `<span>` with `whitespace-pre-wrap`
- Ref segments as inline badge buttons: small pill-shaped `📄 DORA p.23` that on click opens the PDF modal

**`PdfPreviewModal.tsx` (new)**

Uses `react-pdf` library. Props:

```typescript
interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;        // "/api/docs/DORA-CELEX_32022R2554_EN_TXT.pdf"
  initialPage: number;    // page to open to
  highlightText: string;  // text to highlight on the page
  title: string;          // "DORA — Page 23"
}
```

Features:
- Full-screen modal with backdrop
- Header with title + close button
- PDF rendered one page at a time via `<Document>` + `<Page>`
- Page navigation (prev/next + page indicator)
- Text layer enabled (`renderTextLayer={true}`)
- After text layer renders, walk `<span>` elements to find matching text and apply yellow background highlight
- Auto-scroll to first highlighted span via `scrollIntoView`
- Keyboard: Escape to close, arrow keys for page nav

Dependencies: `react-pdf` (wraps pdf.js)

### 3. Data Flow

```
RAG query → 5 sources {source, page, excerpt}
    ↓
LLM prompt with labeled excerpts + citation instruction
    ↓
LLM produces: "...article 15 [REF:DORA.pdf:23:"entities shall implement"]..."
    ↓
Backend returns {analysis, sources}
    ↓
Frontend parseAnalysisText() → [{type:"text",...}, {type:"ref",...}, ...]
    ↓
Render: text spans + clickable 📄 badges
    ↓
Click badge → PdfPreviewModal(fileUrl, page, highlightText)
    ↓
react-pdf renders page, highlights text in yellow
```

## Files to Create/Modify

### Backend
| File | Action | Purpose |
|------|--------|---------|
| `app/services/llm_service.py` | Modify | Accept full source dicts, add citation prompt instructions |
| `app/routers/analysis.py` | Modify | Pass sources to LLM, include sources in response |
| `app/routers/docs.py` | Create | Serve PDFs from `data/docs/` with path sanitization |
| `app/main.py` | Modify | Register docs router |

### Frontend
| File | Action | Purpose |
|------|--------|---------|
| `src/lib/citationParser.ts` | Create | Parse `[REF:...]` markers into structured segments |
| `src/lib/api.ts` | Modify | Update `AnalysisResponse` type to include `sources` |
| `src/components/results/RegulationAnalysisBlock.tsx` | Modify | Render parsed segments with citation badges |
| `src/components/results/PdfPreviewModal.tsx` | Create | Modal PDF viewer with page nav + highlight |
| `src/lib/pdfSetup.ts` | Create | Configure pdf.js worker |

## Fallback & Error Handling

- If LLM produces no `[REF:...]` tags → text renders as-is (current behavior, no regression)
- If PDF file not found → modal shows error message, badge still visible
- If highlight text not found on page → page renders normally without highlight
- If `react-pdf` fails to load → modal shows "Impossible de charger le document" error state

## Out of Scope

- Full-text search within PDFs
- Annotation/bookmark system
- Downloading PDFs
- Multi-page highlight (highlight stays on one page)
