# Incident History + Structured RAG Analyses — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add incident persistence (JSON file), structured LLM summaries (incident + per-regulation), parallel RAG-enriched analyses with progressive UI display, similarity search on past incidents, and a full history page.

**Architecture:** Backend saves completed incidents to `data/incidents.json` with embeddings. ChromaDB is reset with 3 regulatory PDFs (DORA, RGPD, LOPMI) using a multilingual embedding model. Three parallel `/api/analysis/{reg}` endpoints query ChromaDB + LLM to produce detailed regulation analyses. Frontend displays results progressively (summary immediately, analyses with spinners), auto-saves after all analyses complete, and offers a history page with detail view.

**Tech Stack:** FastAPI, ChromaDB, `paraphrase-multilingual-MiniLM-L12-v2`, Anthropic Claude API, React 18, TypeScript, Tailwind CSS, Axios.

---

## File Map

### Backend — New Files
| File | Responsibility |
|------|---------------|
| `backend/app/services/incident_store.py` | JSON file persistence: save, list, get, delete, find_similar |
| `backend/app/routers/incidents.py` | REST endpoints: GET list, GET detail, POST save, DELETE |
| `backend/app/routers/analysis.py` | 3 parallel RAG+LLM analysis endpoints per regulation |
| `backend/scripts/reindex.py` | Script to reset ChromaDB and reindex the 3 regulatory PDFs |

### Backend — Modified Files
| File | Changes |
|------|---------|
| `backend/app/main.py` | Register new routers (incidents, analysis) |
| `backend/app/services/rag_service.py` | Change embedding model to multilingual, add `embed_text()` method |
| `backend/app/services/prompt_builder.py` | Update SYSTEM_PROMPT: replace `narrative` with `incident_summary`, shorten `reasoning` |
| `backend/app/services/llm_service.py` | Add `generate_regulation_analysis()` function for RAG-enriched analyses |
| `backend/app/models/session.py` | Add `IncidentRecord`, `RegulationAnalysis` Pydantic models |

### Frontend — New Files
| File | Responsibility |
|------|---------------|
| `frontend/src/components/results/RegulationAnalysisBlock.tsx` | Displays per-regulation detailed analysis with spinner |
| `frontend/src/components/results/SimilarIncidents.tsx` | Displays list of similar past incidents |
| `frontend/src/components/history/IncidentList.tsx` | History page: list of all incidents with delete |
| `frontend/src/components/history/IncidentDetail.tsx` | Detail view for a past incident |

### Frontend — Modified Files
| File | Changes |
|------|---------|
| `frontend/src/lib/api.ts` | New types + API functions; remove `sessionRefine`; replace `narrative` with `incident_summary` |
| `frontend/src/hooks/useSession.ts` | Extended state machine with analyses loading + auto-save |
| `frontend/src/components/results/ResultsDashboard.tsx` | Remove narrative/refine; add incident_summary, analysis blocks, similar incidents |
| `frontend/src/App.tsx` | Add navigation tabs (Session / Historique), history page routing |

---

## Chunk 1: Backend — Persistence & Models

### Task 1: Update Pydantic models

**Files:**
- Modify: `backend/app/models/session.py`

- [ ] **Step 1: Add new models to session.py**

Add these models after the existing ones:

```python
from typing import Optional
import uuid
from datetime import datetime, timezone


class RegulationAnalysis(BaseModel):
    regulation: str  # "dora", "rgpd", "lopmi"
    analysis: str  # 3-4 paragraphs


class IncidentSaveRequest(BaseModel):
    initial_form: InitialForm
    rounds: list[RoundHistory]
    classification: dict  # raw classification from LLM
    incident_summary: str
    actions: list[dict]
    unknown_impacts: list[dict]
    analyses: dict  # {"dora": "...", "rgpd": "...", "lopmi": "..."}


class IncidentRecord(BaseModel):
    id: str
    created_at: str
    initial_form: InitialForm
    rounds: list[RoundHistory]
    classification: dict
    incident_summary: str
    actions: list[dict]
    unknown_impacts: list[dict]
    analyses: dict
    embeddings: dict  # {"incident_summary": [...], "dora_analysis": [...], ...}


class IncidentSummary(BaseModel):
    id: str
    created_at: str
    entity_name: str
    incident_types: list[str]
    global_level: str
    first_deadline_hours: Optional[int] = None
```

- [ ] **Step 2: Verify imports work**

Run: `cd /Users/matthieu.kaeppelin/Documents/3-Cours/Master\ DS\ -\ X/Capstone/bnp-incident-tool/backend && python -c "from app.models.session import IncidentRecord, IncidentSaveRequest, IncidentSummary; print('OK')"`

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/session.py
git commit -m "feat: add Pydantic models for incident persistence"
```

---

### Task 2: Create incident_store service

**Files:**
- Create: `backend/app/services/incident_store.py`

- [ ] **Step 1: Create the incident store service**

```python
import json
import uuid
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

DATA_FILE = Path("data/incidents.json")


def _read_db() -> list[dict]:
    if not DATA_FILE.exists():
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_db(data: list[dict]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def save_incident(incident_data: dict, embeddings: dict) -> dict:
    db = _read_db()
    record = {
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        **incident_data,
        "embeddings": embeddings,
    }
    db.append(record)
    _write_db(db)
    return record


def list_incidents() -> list[dict]:
    db = _read_db()
    summaries = []
    for inc in db:
        classification = inc.get("classification", {})
        initial_form = inc.get("initial_form", {})
        summaries.append({
            "id": inc["id"],
            "created_at": inc["created_at"],
            "entity_name": initial_form.get("entity_name", ""),
            "incident_types": initial_form.get("incident_types", []),
            "global_level": classification.get("global_level", "non_qualifie"),
            "first_deadline_hours": inc.get("first_deadline_hours"),
        })
    return sorted(summaries, key=lambda x: x["created_at"], reverse=True)


def get_incident(incident_id: str) -> Optional[dict]:
    db = _read_db()
    for inc in db:
        if inc["id"] == incident_id:
            return inc
    return None


def delete_incident(incident_id: str) -> bool:
    db = _read_db()
    new_db = [inc for inc in db if inc["id"] != incident_id]
    if len(new_db) == len(db):
        return False
    _write_db(new_db)
    return True


def find_similar(embedding: list[float], top_k: int = 5, exclude_id: Optional[str] = None) -> list[dict]:
    db = _read_db()
    scored = []
    for inc in db:
        if exclude_id and inc["id"] == exclude_id:
            continue
        inc_emb = inc.get("embeddings", {}).get("incident_summary")
        if not inc_emb:
            continue
        score = _cosine_similarity(embedding, inc_emb)
        initial_form = inc.get("initial_form", {})
        classification = inc.get("classification", {})
        scored.append({
            "id": inc["id"],
            "created_at": inc["created_at"],
            "entity_name": initial_form.get("entity_name", ""),
            "incident_types": initial_form.get("incident_types", []),
            "global_level": classification.get("global_level", ""),
            "incident_summary": inc.get("incident_summary", "")[:200],
            "similarity": round(score, 4),
        })
    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return scored[:top_k]
```

- [ ] **Step 2: Verify module imports**

Run: `cd /Users/matthieu.kaeppelin/Documents/3-Cours/Master\ DS\ -\ X/Capstone/bnp-incident-tool/backend && python -c "from app.services.incident_store import save_incident, list_incidents, get_incident, delete_incident, find_similar; print('OK')"`

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/incident_store.py
git commit -m "feat: add incident_store service for JSON file persistence"
```

---

### Task 3: Create incidents router

**Files:**
- Create: `backend/app/routers/incidents.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create the incidents router**

```python
from fastapi import APIRouter, HTTPException
from app.services import incident_store
from app.services.rag_service import get_rag_service

router = APIRouter()


@router.get("/incidents")
async def list_all():
    return incident_store.list_incidents()


@router.get("/incidents/{incident_id}")
async def get_one(incident_id: str):
    record = incident_store.get_incident(incident_id)
    if not record:
        raise HTTPException(status_code=404, detail="Incident non trouvé")
    return record


@router.post("/incidents")
async def save(body: dict):
    rag = get_rag_service()
    embeddings = {}
    summary_text = body.get("incident_summary", "")
    if summary_text:
        embeddings["incident_summary"] = rag.embed_text(summary_text)
    analyses = body.get("analyses", {})
    for reg in ["dora", "rgpd", "lopmi"]:
        text = analyses.get(reg, "")
        if text:
            embeddings[f"{reg}_analysis"] = rag.embed_text(text)
    record = incident_store.save_incident(body, embeddings)
    return record


@router.delete("/incidents/{incident_id}")
async def delete(incident_id: str):
    deleted = incident_store.delete_incident(incident_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Incident non trouvé")
    return {"ok": True}


@router.post("/incidents/similar")
async def find_similar(body: dict):
    rag = get_rag_service()
    text = body.get("incident_summary", "")
    if not text:
        return []
    embedding = rag.embed_text(text)
    exclude_id = body.get("exclude_id")
    return incident_store.find_similar(embedding, top_k=5, exclude_id=exclude_id)
```

- [ ] **Step 2: Register the router in main.py**

Add to `backend/app/main.py` after existing router imports:

```python
from app.routers import session, rag, incidents

# ... existing code ...

app.include_router(incidents.router, prefix="/api")
```

- [ ] **Step 3: Verify server starts**

Run: `cd /Users/matthieu.kaeppelin/Documents/3-Cours/Master\ DS\ -\ X/Capstone/bnp-incident-tool/backend && python -c "from app.main import app; print('Routes:', [r.path for r in app.routes])"`

Expected: Routes list includes `/api/incidents`, `/api/incidents/{incident_id}`, etc.

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/incidents.py backend/app/main.py
git commit -m "feat: add incidents REST endpoints (list, get, save, delete, similar)"
```

---

## Chunk 2: Backend — RAG Overhaul & Analysis Pipeline

### Task 4: Update RAG service with multilingual model + embed_text

**Files:**
- Modify: `backend/app/services/rag_service.py`

- [ ] **Step 1: Change default model and add embed_text method**

In `rag_service.py`, change the default model parameter and add `embed_text`:

```python
# Change default model_name in __init__:
def __init__(
    self,
    docs_path: str = "data/docs",
    persist_path: str = "data/chroma_db",
    model_name: str = "paraphrase-multilingual-MiniLM-L12-v2",
):
```

Add this method to the `RagService` class after `query()`:

```python
def embed_text(self, text: str) -> list[float]:
    embeddings = self._get_embeddings()
    return embeddings.embed_query(text)
```

- [ ] **Step 2: Verify embed_text works**

Run: `cd /Users/matthieu.kaeppelin/Documents/3-Cours/Master\ DS\ -\ X/Capstone/bnp-incident-tool/backend && python -c "
from app.services.rag_service import RagService
s = RagService()
v = s.embed_text('test')
print(f'Embedding dim: {len(v)}, type: {type(v[0])}')
"`

Expected: `Embedding dim: 384, type: <class 'float'>`

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/rag_service.py
git commit -m "feat: switch to multilingual embedding model + add embed_text method"
```

---

### Task 5: Reindex ChromaDB with regulatory documents

**Files:**
- Create: `backend/scripts/reindex.py`

- [ ] **Step 1: Create reindex script**

```python
#!/usr/bin/env python3
"""Reset ChromaDB and reindex the 3 regulatory PDFs (DORA, RGPD, LOPMI)."""

import shutil
from pathlib import Path

DOCS_SOURCE = Path("/Users/matthieu.kaeppelin/Documents/3-Cours/Master DS - X/Capstone/Capstone_documentation/Reglementations applicables")
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
```

- [ ] **Step 2: Run the reindex script**

Run: `cd /Users/matthieu.kaeppelin/Documents/3-Cours/Master\ DS\ -\ X/Capstone/bnp-incident-tool/backend && python scripts/reindex.py`

Expected: Output showing 3 PDFs copied and indexed.

- [ ] **Step 3: Verify the new index**

Run: `cd /Users/matthieu.kaeppelin/Documents/3-Cours/Master\ DS\ -\ X/Capstone/bnp-incident-tool/backend && python -c "
from app.services.rag_service import RagService
s = RagService()
s.load_existing_index()
r = s.query('notification CNIL violation données personnelles', k=3)
for src in r['sources']:
    print(f'{src[\"source\"]} p.{src[\"page\"]} — {src[\"excerpt\"][:80]}...')
"`

Expected: Results from RGPD PDF.

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/reindex.py
git commit -m "feat: add reindex script for regulatory PDFs (DORA, RGPD, LOPMI)"
```

---

### Task 6: Update system prompt — replace narrative with incident_summary

**Files:**
- Modify: `backend/app/services/prompt_builder.py`

- [ ] **Step 1: Update the CONCLUSION section of SYSTEM_PROMPT**

Replace the JSON example block in CONCLUSION (lines 120-137) with:

```
CONCLUSION (done=true) :
{
  "done": true,
  "classification": {
    "global_level": "majeur",
    "dora": { "level": "majeur", "applicable": true, "reasoning": "1-2 phrases concises justifiant le niveau." },
    "rgpd": { "level": "significatif", "applicable": true, "reasoning": "1-2 phrases concises." },
    "lopmi": { "level": "non_applicable", "applicable": false, "reasoning": "1-2 phrases." }
  },
  "actions": [
    { "regulation": "DORA", "action": "Rapport initial ACPR", "deadline_hours": 4, "deadline_label": "4h", "done": false }
  ],
  "first_deadline_hours": 4,
  "unknown_impacts": [
    { "field": "Volume de données", "impact": "DBRA approximatif", "action_required": "Contacter le DPO" }
  ],
  "incident_summary": "Résumé factuel de l'incident en 3-4 paragraphes. Inclure : nature exacte, systèmes affectés, données compromises, durée/impact, actions de remédiation. Ton neutre, pas d'analyse juridique."
}
```

Remove any mention of `narrative` in the prompt. The old line:
```
"narrative": "4-5 paragraphes juridiques précis citant les articles..."
```
is deleted entirely.

- [ ] **Step 2: Verify prompt compiles**

Run: `cd /Users/matthieu.kaeppelin/Documents/3-Cours/Master\ DS\ -\ X/Capstone/bnp-incident-tool/backend && python -c "from app.services.prompt_builder import SYSTEM_PROMPT; assert 'incident_summary' in SYSTEM_PROMPT; assert 'narrative' not in SYSTEM_PROMPT; print('OK')"`

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/prompt_builder.py
git commit -m "feat: replace narrative with incident_summary in system prompt"
```

---

### Task 7: Add regulation analysis endpoint + LLM function

**Files:**
- Modify: `backend/app/services/llm_service.py`
- Create: `backend/app/routers/analysis.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Add generate_regulation_analysis to llm_service.py**

Add this function at the end of `llm_service.py`:

```python
def generate_regulation_analysis(
    regulation: str,
    classification_json: str,
    incident_summary: str,
    rag_excerpts: list[str],
) -> str:
    """Generate a detailed 3-4 paragraph analysis for a specific regulation using RAG excerpts."""
    reg_names = {
        "dora": "DORA (Règlement UE 2022/2554)",
        "rgpd": "RGPD (Règlement UE 2016/679, Articles 33-34)",
        "lopmi": "LOPMI (Code des assurances, Art. L12-10-1)",
    }
    reg_label = reg_names.get(regulation, regulation.upper())

    excerpts_text = "\n\n---\n\n".join(
        f"Extrait réglementaire ({i+1}) :\n{exc}"
        for i, exc in enumerate(rag_excerpts)
    )

    user_message = f"""CLASSIFICATION DE L'INCIDENT :
{classification_json}

RÉSUMÉ DE L'INCIDENT :
{incident_summary}

EXTRAITS DU TEXTE RÉGLEMENTAIRE {reg_label} :
{excerpts_text}

Rédige une analyse détaillée (3-4 paragraphes) expliquant pourquoi et comment la réglementation {reg_label} s'applique (ou ne s'applique pas) à cet incident. Cite les articles précis issus des extraits fournis. Ton juridique professionnel, en français.

Retourne UNIQUEMENT le texte de l'analyse (pas de JSON, pas de titre)."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=f"Tu es un expert juridique BNP Paribas spécialisé en {reg_label}. Tu rédiges des analyses réglementaires détaillées avec citations d'articles.",
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text.strip()
```

- [ ] **Step 2: Create the analysis router**

```python
from fastapi import APIRouter, HTTPException
from app.services import llm_service
from app.services.rag_service import get_rag_service
from pydantic import BaseModel

router = APIRouter()


class AnalysisRequest(BaseModel):
    classification_json: str
    incident_summary: str


class AnalysisResponse(BaseModel):
    regulation: str
    analysis: str


@router.post("/analysis/{regulation}", response_model=AnalysisResponse)
async def analyze_regulation(regulation: str, req: AnalysisRequest):
    if regulation not in ("dora", "rgpd", "lopmi"):
        raise HTTPException(status_code=400, detail=f"Réglementation inconnue: {regulation}")

    try:
        rag = get_rag_service()
        # Search regulatory documents for relevant excerpts
        search_query = f"{regulation.upper()} {req.incident_summary[:500]}"
        rag_result = rag.query(search_query, k=5)
        excerpts = [s.get("excerpt", "") for s in rag_result.get("sources", [])]

        analysis = llm_service.generate_regulation_analysis(
            regulation=regulation,
            classification_json=req.classification_json,
            incident_summary=req.incident_summary,
            rag_excerpts=excerpts,
        )
        return AnalysisResponse(regulation=regulation, analysis=analysis)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=f"Service RAG non disponible : {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 3: Register analysis router in main.py**

```python
from app.routers import session, rag, incidents, analysis

# ...existing code...

app.include_router(analysis.router, prefix="/api")
```

- [ ] **Step 4: Verify server starts with all routes**

Run: `cd /Users/matthieu.kaeppelin/Documents/3-Cours/Master\ DS\ -\ X/Capstone/bnp-incident-tool/backend && python -c "from app.main import app; print([r.path for r in app.routes if '/api' in getattr(r, 'path', '')])"`

Expected: Includes `/api/analysis/{regulation}`

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/llm_service.py backend/app/routers/analysis.py backend/app/main.py
git commit -m "feat: add per-regulation RAG analysis endpoints"
```

---

## Chunk 3: Frontend — API Types & Session Hook

### Task 8: Update frontend API types and functions

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Update ClassificationData — replace narrative with incident_summary**

Replace line 82 (`narrative: string;`) with `incident_summary: string;`

- [ ] **Step 2: Add new types**

Add after `ClassificationData`:

```typescript
// === REGULATION ANALYSIS (RAG-enriched) ===

export interface RegulationAnalysis {
  regulation: string;
  analysis: string;
}

// === INCIDENT PERSISTENCE ===

export interface IncidentSummaryItem {
  id: string;
  created_at: string;
  entity_name: string;
  incident_types: string[];
  global_level: string;
  first_deadline_hours: number | null;
}

export interface SimilarIncident {
  id: string;
  created_at: string;
  entity_name: string;
  incident_types: string[];
  global_level: string;
  incident_summary: string;
  similarity: number;
}
```

- [ ] **Step 3: Add new API functions and remove sessionRefine**

Remove the `sessionRefine` function entirely. Add:

```typescript
// === REGULATION ANALYSES (parallel RAG calls) ===

export const analyzeRegulation = async (
  regulation: "dora" | "rgpd" | "lopmi",
  classification_json: string,
  incident_summary: string
): Promise<RegulationAnalysis> => {
  const { data } = await api.post(`/analysis/${regulation}`, {
    classification_json,
    incident_summary,
  });
  return data;
};

// === INCIDENT PERSISTENCE ===

export const saveIncident = async (incidentData: Record<string, unknown>): Promise<{ id: string }> => {
  const { data } = await api.post("/incidents", incidentData);
  return data;
};

export const listIncidents = async (): Promise<IncidentSummaryItem[]> => {
  const { data } = await api.get("/incidents");
  return data;
};

export const getIncident = async (id: string): Promise<Record<string, unknown>> => {
  const { data } = await api.get(`/incidents/${id}`);
  return data;
};

export const deleteIncident = async (id: string): Promise<void> => {
  await api.delete(`/incidents/${id}`);
};

export const findSimilarIncidents = async (
  incident_summary: string,
  exclude_id?: string
): Promise<SimilarIncident[]> => {
  const { data } = await api.post("/incidents/similar", { incident_summary, exclude_id });
  return data;
};
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /Users/matthieu.kaeppelin/Documents/3-Cours/Master\ DS\ -\ X/Capstone/bnp-incident-tool/frontend && npx tsc --noEmit 2>&1 | head -20`

Expected: Errors only in files that still reference old `narrative` (useSession.ts, ResultsDashboard.tsx) — those are updated in next tasks.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: update API types — incident persistence, regulation analyses, remove sessionRefine"
```

---

### Task 9: Update useSession hook — analyses loading + auto-save

**Files:**
- Modify: `frontend/src/hooks/useSession.ts`

- [ ] **Step 1: Rewrite useSession.ts**

Replace the entire file with:

```typescript
import { useState, useCallback } from "react";
import {
  InitialForm,
  QuestionAnswer,
  RoundHistory,
  QuestionRoundData,
  ClassificationData,
  RegulationAnalysis,
  SimilarIncident,
  sessionStart,
  sessionContinue,
  analyzeRegulation,
  saveIncident,
  findSimilarIncidents,
} from "../lib/api";

type AnalysesState = {
  dora: { loading: boolean; result: RegulationAnalysis | null; error: string | null };
  rgpd: { loading: boolean; result: RegulationAnalysis | null; error: string | null };
  lopmi: { loading: boolean; result: RegulationAnalysis | null; error: string | null };
};

type SessionState =
  | { phase: "initial" }
  | { phase: "questions"; currentRound: QuestionRoundData; roundNumber: number }
  | { phase: "result"; classification: ClassificationData };

function safeParseClassification(parsed: unknown): ClassificationData {
  const p = parsed as Record<string, unknown>;
  return {
    done: true,
    classification: (p.classification as ClassificationData["classification"]) ?? {
      global_level: "non_qualifie",
      dora: { level: "mineur", applicable: false, reasoning: "" },
      rgpd: { level: "non_applicable", applicable: false, reasoning: "" },
      lopmi: { level: "non_applicable", applicable: false, reasoning: "" },
    },
    actions: (p.actions as ClassificationData["actions"]) ?? [],
    first_deadline_hours: (p.first_deadline_hours as number | null) ?? null,
    unknown_impacts: (p.unknown_impacts as ClassificationData["unknown_impacts"]) ?? [],
    incident_summary: (p.incident_summary as string) ?? "Résumé en cours de génération...",
  };
}

const INITIAL_ANALYSES: AnalysesState = {
  dora: { loading: false, result: null, error: null },
  rgpd: { loading: false, result: null, error: null },
  lopmi: { loading: false, result: null, error: null },
};

export function useSession() {
  const [state, setState] = useState<SessionState>({ phase: "initial" });
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [initialForm, setInitialForm] = useState<InitialForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<AnalysesState>(INITIAL_ANALYSES);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [similarIncidents, setSimilarIncidents] = useState<SimilarIncident[]>([]);

  const triggerAnalyses = useCallback(
    (classification: ClassificationData, form: InitialForm, currentHistory: RoundHistory[]) => {
      const classificationJson = JSON.stringify(classification.classification);
      const summary = classification.incident_summary;

      const regs = ["dora", "rgpd", "lopmi"] as const;
      const analysisResults: Record<string, string> = {};
      let completed = 0;

      for (const reg of regs) {
        setAnalyses((prev) => ({
          ...prev,
          [reg]: { loading: true, result: null, error: null },
        }));

        analyzeRegulation(reg, classificationJson, summary)
          .then((result) => {
            setAnalyses((prev) => ({
              ...prev,
              [reg]: { loading: false, result, error: null },
            }));
            analysisResults[reg] = result.analysis;
          })
          .catch(() => {
            setAnalyses((prev) => ({
              ...prev,
              [reg]: { loading: false, result: null, error: "Analyse indisponible" },
            }));
            analysisResults[reg] = "";
          })
          .finally(() => {
            completed++;
            if (completed === 3) {
              // Auto-save when all analyses done
              const incidentData = {
                initial_form: form,
                rounds: currentHistory,
                classification: classification.classification,
                incident_summary: summary,
                actions: classification.actions,
                unknown_impacts: classification.unknown_impacts,
                analyses: analysisResults,
              };
              saveIncident(incidentData)
                .then((saved) => setIncidentId(saved.id))
                .catch(() => {}); // fail silently

              // Find similar incidents
              findSimilarIncidents(summary)
                .then(setSimilarIncidents)
                .catch(() => {});
            }
          });
      }
    },
    []
  );

  const startSession = async (form: InitialForm) => {
    setLoading(true);
    setError(null);
    setInitialForm(form);
    try {
      const res = await sessionStart(form);
      const parsed = JSON.parse(res.raw_json);
      if (parsed.done) {
        const classification = safeParseClassification(parsed);
        setState({ phase: "result", classification });
        triggerAnalyses(classification, form, []);
      } else {
        setState({
          phase: "questions",
          currentRound: parsed as QuestionRoundData,
          roundNumber: 1,
        });
      }
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Erreur lors du démarrage de la session.");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswers = async (
    answers: QuestionAnswer[],
    currentRound: QuestionRoundData,
    roundNumber: number
  ) => {
    if (!initialForm) return;
    setLoading(true);
    setError(null);

    const newHistoryEntry: RoundHistory = {
      round_number: roundNumber,
      round_title: currentRound.round_title,
      questions_json: JSON.stringify(currentRound),
      answers,
    };
    const updatedHistory = [...history, newHistoryEntry];

    try {
      const res = await sessionContinue(initialForm, updatedHistory, answers);
      const parsed = JSON.parse(res.raw_json);
      setHistory(updatedHistory);
      if (parsed.done) {
        const classification = safeParseClassification(parsed);
        setState({ phase: "result", classification });
        triggerAnalyses(classification, initialForm, updatedHistory);
      } else {
        setState({
          phase: "questions",
          currentRound: parsed as QuestionRoundData,
          roundNumber: roundNumber + 1,
        });
      }
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Erreur lors de la soumission des réponses.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setState({ phase: "initial" });
    setHistory([]);
    setInitialForm(null);
    setError(null);
    setAnalyses(INITIAL_ANALYSES);
    setIncidentId(null);
    setSimilarIncidents([]);
  };

  return {
    state,
    loading,
    error,
    startSession,
    submitAnswers,
    reset,
    initialForm,
    analyses,
    incidentId,
    similarIncidents,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles (ignoring downstream errors)**

Run: `cd /Users/matthieu.kaeppelin/Documents/3-Cours/Master\ DS\ -\ X/Capstone/bnp-incident-tool/frontend && npx tsc --noEmit 2>&1 | grep -c "useSession"`

Expected: 0 errors from useSession.ts itself (errors from consumers are expected and fixed in next tasks).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useSession.ts
git commit -m "feat: extend useSession with parallel analyses, auto-save, similar incidents"
```

---

## Chunk 4: Frontend — Results UI Overhaul

### Task 10: Create RegulationAnalysisBlock component

**Files:**
- Create: `frontend/src/components/results/RegulationAnalysisBlock.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { RegulationAnalysis } from "../../lib/api";

interface Props {
  regulation: string;
  analysis: RegulationAnalysis | null;
  isLoading: boolean;
  error: string | null;
}

const REG_TITLES: Record<string, string> = {
  DORA: "Analyse DORA",
  RGPD: "Analyse RGPD",
  LOPMI: "Analyse LOPMI",
};

export default function RegulationAnalysisBlock({ regulation, analysis, isLoading, error }: Props) {
  const title = REG_TITLES[regulation] ?? `Analyse ${regulation}`;

  return (
    <div className="bg-white rounded-lg border p-5">
      <h3 className="font-semibold text-gray-900 text-sm mb-3">{title}</h3>

      {isLoading && (
        <div className="flex items-center gap-3 text-sm text-gray-500 py-4">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Analyse en cours — enrichissement avec les textes réglementaires...
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
      )}

      {analysis && !isLoading && (
        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {analysis.analysis}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/results/RegulationAnalysisBlock.tsx
git commit -m "feat: add RegulationAnalysisBlock component with loading spinner"
```

---

### Task 11: Create SimilarIncidents component

**Files:**
- Create: `frontend/src/components/results/SimilarIncidents.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { SimilarIncident } from "../../lib/api";

interface Props {
  incidents: SimilarIncident[];
}

const LEVEL_COLORS: Record<string, string> = {
  majeur: "bg-red-100 text-red-800",
  significatif: "bg-orange-100 text-orange-800",
  mineur: "bg-blue-100 text-blue-800",
  non_applicable: "bg-gray-100 text-gray-600",
};

export default function SimilarIncidents({ incidents }: Props) {
  if (incidents.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border p-5">
      <h3 className="font-semibold text-gray-900 text-sm mb-3">
        Incidents similaires
      </h3>
      <div className="space-y-3">
        {incidents.map((inc) => {
          const badgeClass = LEVEL_COLORS[inc.global_level] ?? LEVEL_COLORS.non_applicable;
          return (
            <div key={inc.id} className="border rounded-md p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {new Date(inc.created_at).toLocaleDateString("fr-FR")}
                  </span>
                  <span className="text-xs font-medium text-gray-700">
                    {inc.entity_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
                    {inc.global_level}
                  </span>
                  <span className="text-xs text-gray-400">
                    {Math.round(inc.similarity * 100)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">
                {inc.incident_summary}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/results/SimilarIncidents.tsx
git commit -m "feat: add SimilarIncidents component"
```

---

### Task 12: Rewrite ResultsDashboard

**Files:**
- Modify: `frontend/src/components/results/ResultsDashboard.tsx`

- [ ] **Step 1: Rewrite ResultsDashboard.tsx**

Replace the entire file:

```tsx
import type {
  ClassificationData,
  InitialForm,
  ActionItem,
  RegulationClassification,
  RegulationAnalysis,
  SimilarIncident,
} from "../../lib/api";
import { deleteIncident } from "../../lib/api";
import Countdown from "./Countdown";
import RegulationBlock from "./RegulationBlock";
import RegulationAnalysisBlock from "./RegulationAnalysisBlock";
import SimilarIncidents from "./SimilarIncidents";

interface AnalysisState {
  loading: boolean;
  result: RegulationAnalysis | null;
  error: string | null;
}

interface Props {
  result: ClassificationData;
  initialForm: InitialForm;
  onReset: () => void;
  analyses: {
    dora: AnalysisState;
    rgpd: AnalysisState;
    lopmi: AnalysisState;
  };
  incidentId: string | null;
  similarIncidents: SimilarIncident[];
}

const LEVEL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  majeur: { label: "MAJEUR", bg: "bg-red-600", text: "text-white" },
  significatif: { label: "SIGNIFICATIF", bg: "bg-orange-500", text: "text-white" },
  mineur: { label: "MINEUR", bg: "bg-blue-600", text: "text-white" },
  non_qualifie: { label: "NON QUALIFIÉ", bg: "bg-gray-400", text: "text-white" },
  non_applicable: { label: "NON APPLICABLE", bg: "bg-gray-300", text: "text-gray-700" },
};

export default function ResultsDashboard({
  result,
  initialForm,
  onReset,
  analyses,
  incidentId,
  similarIncidents,
}: Props) {
  const globalConfig =
    LEVEL_CONFIG[result.classification.global_level] ?? LEVEL_CONFIG.non_qualifie;

  const regulationKeys = ["dora", "rgpd", "lopmi"] as const;

  const actionsForReg = (reg: string): ActionItem[] =>
    result.actions.filter((a) => a.regulation === reg.toUpperCase());

  const classForReg = (reg: string): RegulationClassification =>
    result.classification[reg as keyof typeof result.classification] as RegulationClassification;

  const handleDelete = async () => {
    if (!incidentId) return;
    if (!window.confirm("Supprimer cet incident de l'historique ?")) return;
    try {
      await deleteIncident(incidentId);
      onReset();
    } catch {
      // fail silently
    }
  };

  return (
    <div className="space-y-6">
      {/* Severity banner */}
      <div className={`${globalConfig.bg} rounded-lg p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${globalConfig.text} opacity-75`}>
              Niveau de gravité global
            </p>
            <p className={`text-2xl font-bold ${globalConfig.text} mt-1`}>
              {globalConfig.label}
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {regulationKeys.map((reg) => {
                const r = classForReg(reg);
                return r?.applicable ? (
                  <span
                    key={reg}
                    className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium uppercase"
                  >
                    {reg}
                  </span>
                ) : null;
              })}
            </div>
          </div>
          {result.first_deadline_hours && (
            <Countdown
              detectionDatetime={initialForm.detection_datetime}
              firstDeadlineHours={result.first_deadline_hours}
            />
          )}
        </div>
      </div>

      {/* Incident summary */}
      <div className="bg-white rounded-lg border p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Résumé de l'incident</h3>
        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {result.incident_summary}
        </div>
      </div>

      {/* Similar incidents */}
      <SimilarIncidents incidents={similarIncidents} />

      {/* Unknown impacts */}
      {result.unknown_impacts && result.unknown_impacts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-semibold text-orange-800 text-sm mb-2">
            Informations manquantes — impact sur la qualification
          </h3>
          <ul className="space-y-2">
            {result.unknown_impacts.map((ui, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-orange-900">{ui.field} :</span>{" "}
                <span className="text-orange-700">{ui.impact}</span>
                {ui.action_required && (
                  <div className="text-orange-600 text-xs mt-0.5">
                    Action : {ui.action_required}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Regulation classification blocks + analysis blocks */}
      {regulationKeys.map((reg) => {
        const r = classForReg(reg);
        const a = analyses[reg];
        return (
          <div key={reg} className="space-y-3">
            {r?.applicable && (
              <RegulationBlock
                regulation={reg.toUpperCase()}
                result={r}
                actions={actionsForReg(reg)}
              />
            )}
            <RegulationAnalysisBlock
              regulation={reg.toUpperCase()}
              analysis={a.result}
              isLoading={a.loading}
              error={a.error}
            />
          </div>
        );
      })}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 py-2.5 px-6 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Nouvel incident
        </button>
        {incidentId && (
          <button
            onClick={handleDelete}
            className="py-2.5 px-6 border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors"
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/results/ResultsDashboard.tsx
git commit -m "feat: rewrite ResultsDashboard with progressive analyses, similar incidents, delete"
```

---

### Task 13: Update App.tsx — pass new props + add history navigation

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/components/history/IncidentList.tsx`
- Create: `frontend/src/components/history/IncidentDetail.tsx`

- [ ] **Step 1: Create IncidentList component**

```tsx
import { useEffect, useState } from "react";
import type { IncidentSummaryItem } from "../../lib/api";
import { listIncidents, deleteIncident } from "../../lib/api";

interface Props {
  onSelectIncident: (id: string) => void;
}

const LEVEL_COLORS: Record<string, string> = {
  majeur: "bg-red-100 text-red-800",
  significatif: "bg-orange-100 text-orange-800",
  mineur: "bg-blue-100 text-blue-800",
  non_applicable: "bg-gray-100 text-gray-600",
};

export default function IncidentList({ onSelectIncident }: Props) {
  const [incidents, setIncidents] = useState<IncidentSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const data = await listIncidents();
      setIncidents(data);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Supprimer cet incident ?")) return;
    try {
      await deleteIncident(id);
      setIncidents((prev) => prev.filter((inc) => inc.id !== id));
    } catch {
      // fail silently
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
        Chargement de l'historique...
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">Aucun incident enregistré.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Historique des incidents</h2>
      {incidents.map((inc) => {
        const badgeClass = LEVEL_COLORS[inc.global_level] ?? LEVEL_COLORS.non_applicable;
        return (
          <div
            key={inc.id}
            onClick={() => onSelectIncident(inc.id)}
            className="bg-white rounded-lg border p-4 cursor-pointer hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {new Date(inc.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-sm font-medium text-gray-800">
                  {inc.entity_name}
                </span>
                <span className="text-xs text-gray-500">
                  {inc.incident_types.join(", ")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
                  {inc.global_level}
                </span>
                <button
                  onClick={(e) => handleDelete(inc.id, e)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create IncidentDetail component**

```tsx
import { useEffect, useState } from "react";
import { getIncident } from "../../lib/api";

interface Props {
  incidentId: string;
  onBack: () => void;
}

const LEVEL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  majeur: { label: "MAJEUR", bg: "bg-red-600", text: "text-white" },
  significatif: { label: "SIGNIFICATIF", bg: "bg-orange-500", text: "text-white" },
  mineur: { label: "MINEUR", bg: "bg-blue-600", text: "text-white" },
  non_qualifie: { label: "NON QUALIFIÉ", bg: "bg-gray-400", text: "text-white" },
  non_applicable: { label: "NON APPLICABLE", bg: "bg-gray-300", text: "text-gray-700" },
};

export default function IncidentDetail({ incidentId, onBack }: Props) {
  const [incident, setIncident] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getIncident(incidentId)
      .then(setIncident)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [incidentId]);

  if (loading) {
    return <div className="py-12 text-center text-gray-500 text-sm">Chargement...</div>;
  }

  if (!incident) {
    return <div className="py-12 text-center text-red-500 text-sm">Incident introuvable.</div>;
  }

  const classification = incident.classification as Record<string, unknown> | undefined;
  const globalLevel = (classification?.global_level as string) ?? "non_qualifie";
  const globalConfig = LEVEL_CONFIG[globalLevel] ?? LEVEL_CONFIG.non_qualifie;
  const initialForm = incident.initial_form as Record<string, unknown> | undefined;
  const analyses = incident.analyses as Record<string, string> | undefined;
  const summary = (incident.incident_summary as string) ?? "";
  const actions = (incident.actions as Array<Record<string, unknown>>) ?? [];

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        &larr; Retour à l'historique
      </button>

      {/* Severity banner */}
      <div className={`${globalConfig.bg} rounded-lg p-5`}>
        <p className={`text-xs font-semibold uppercase tracking-wide ${globalConfig.text} opacity-75`}>
          Niveau de gravité global
        </p>
        <p className={`text-2xl font-bold ${globalConfig.text} mt-1`}>
          {globalConfig.label}
        </p>
        <p className={`text-xs ${globalConfig.text} opacity-75 mt-1`}>
          {initialForm?.entity_name as string} — {new Date(incident.created_at as string).toLocaleDateString("fr-FR")}
        </p>
      </div>

      {/* Incident summary */}
      <div className="bg-white rounded-lg border p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Résumé de l'incident</h3>
        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {summary}
        </div>
      </div>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Actions requises</h3>
          <div className="space-y-2">
            {actions.map((action, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{action.action as string}</span>
                <span className="text-xs border rounded px-2 py-0.5 text-gray-500">
                  {action.deadline_label as string}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regulation analyses */}
      {analyses && ["dora", "rgpd", "lopmi"].map((reg) => {
        const text = analyses[reg];
        if (!text) return null;
        return (
          <div key={reg} className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">
              Analyse {reg.toUpperCase()}
            </h3>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite App.tsx with navigation**

```tsx
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSession } from "./hooks/useSession";
import InitialForm from "./components/session/InitialForm";
import QuestionRound from "./components/session/QuestionRound";
import ResultsDashboard from "./components/results/ResultsDashboard";
import IncidentList from "./components/history/IncidentList";
import IncidentDetail from "./components/history/IncidentDetail";

const queryClient = new QueryClient();

type View = "session" | "history" | { detail: string };

function AppContent() {
  const {
    state,
    loading,
    error,
    startSession,
    submitAnswers,
    reset,
    initialForm,
    analyses,
    incidentId,
    similarIncidents,
  } = useSession();

  const [view, setView] = useState<View>("session");

  const handleNavSession = () => {
    setView("session");
  };

  const handleNavHistory = () => {
    setView("history");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-700 rounded" />
            <div>
              <h1 className="font-semibold text-gray-900">
                Outil de Notification d'Incidents
              </h1>
              <p className="text-xs text-gray-500">
                BNP Paribas — Direction Juridique Digital & IP
              </p>
            </div>
          </div>
          <nav className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={handleNavSession}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === "session"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Nouvelle session
            </button>
            <button
              onClick={handleNavHistory}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view !== "session"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Historique
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {view === "session" && (
          <>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {state.phase === "initial" && (
              <InitialForm onSubmit={startSession} loading={loading} />
            )}

            {state.phase === "questions" && (
              <QuestionRound
                round={state.currentRound}
                roundNumber={state.roundNumber}
                onSubmit={(answers) =>
                  submitAnswers(answers, state.currentRound, state.roundNumber)
                }
                loading={loading}
              />
            )}

            {state.phase === "result" && initialForm && (
              <ResultsDashboard
                result={state.classification}
                initialForm={initialForm}
                onReset={reset}
                analyses={analyses}
                incidentId={incidentId}
                similarIncidents={similarIncidents}
              />
            )}
          </>
        )}

        {view === "history" && (
          <IncidentList
            onSelectIncident={(id) => setView({ detail: id })}
          />
        )}

        {typeof view === "object" && "detail" in view && (
          <IncidentDetail
            incidentId={view.detail}
            onBack={handleNavHistory}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 4: Verify full build**

Run: `cd /Users/matthieu.kaeppelin/Documents/3-Cours/Master\ DS\ -\ X/Capstone/bnp-incident-tool/frontend && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/history/IncidentList.tsx frontend/src/components/history/IncidentDetail.tsx frontend/src/App.tsx
git commit -m "feat: add history page, incident detail, navigation tabs"
```

---

## Chunk 5: Integration & Cleanup

### Task 14: Remove dead code (sessionRefine)

**Files:**
- Modify: `backend/app/routers/session.py`

- [ ] **Step 1: Remove the /session/refine endpoint**

Delete the entire `session_refine` function and its route from `backend/app/routers/session.py` (the `@router.post("/session/refine")` block).

Also remove the `SessionRefineRequest` import from the imports at the top.

- [ ] **Step 2: Remove refine_with_rag from llm_service.py**

Delete the `refine_with_rag` function from `backend/app/services/llm_service.py`.

- [ ] **Step 3: Clean up unused model**

Remove `SessionRefineRequest` from `backend/app/models/session.py`.

- [ ] **Step 4: Verify backend still starts**

Run: `cd /Users/matthieu.kaeppelin/Documents/3-Cours/Master\ DS\ -\ X/Capstone/bnp-incident-tool/backend && python -c "from app.main import app; print('OK')"`

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/session.py backend/app/services/llm_service.py backend/app/models/session.py
git commit -m "cleanup: remove deprecated sessionRefine endpoint and refine_with_rag"
```

---

### Task 15: End-to-end smoke test

- [ ] **Step 1: Start backend**

Run: `cd /Users/matthieu.kaeppelin/Documents/3-Cours/Master\ DS\ -\ X/Capstone/bnp-incident-tool/backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000`

- [ ] **Step 2: Start frontend**

Run: `cd /Users/matthieu.kaeppelin/Documents/3-Cours/Master\ DS\ -\ X/Capstone/bnp-incident-tool/frontend && npm run dev`

- [ ] **Step 3: Manual smoke test checklist**

1. Submit a new incident via the form
2. Answer questions through 2-3 rounds
3. Verify: incident summary appears immediately on results page
4. Verify: 3 regulation analysis blocks show spinners, then resolve with text
5. Verify: similar incidents section appears (empty on first incident)
6. Navigate to Historique tab — verify incident appears in list
7. Click on incident — verify detail page shows all data
8. Delete incident — verify it disappears from list
9. Submit a second incident — verify similar incidents now shows the first one

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete incident history + structured RAG analyses implementation"
```
