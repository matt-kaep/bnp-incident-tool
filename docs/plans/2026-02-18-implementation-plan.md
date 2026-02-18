# BNP Incident Notification Tool — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Construire un outil de notification d'incidents réglementaires (DORA/RGPD/LOPMI) pour les juristes Digital & IP de BNP Paribas, avec wizard formulaire, dashboard d'actions avec deadlines, et chatbot RAG.

**Architecture:** Monorepo avec backend FastAPI exposant un endpoint `/classify` (moteur de règles réglementaires) et `/chat` (RAG sur PDFs DORA/RGPD/LOPMI). Frontend React + TypeScript avec wizard multi-étapes et dashboard résultats. Pas d'authentification ni persistance en V1.

**Tech Stack:** Python 3.11, FastAPI, Pydantic v2, LangChain, ChromaDB, sentence-transformers, React 18, TypeScript, shadcn/ui, Tailwind CSS, TanStack Query, Vite

---

## Task 1 : Scaffold du monorepo

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `frontend/package.json`
- Create: `.gitignore`

**Step 1: Créer la structure de dossiers**

```bash
cd bnp-incident-tool
mkdir -p backend/app/routers backend/app/services backend/app/models backend/tests
mkdir -p backend/data/docs
mkdir -p frontend/src/components/wizard frontend/src/components/results frontend/src/components/chatbot frontend/src/lib
```

**Step 2: Créer `.gitignore`**

```
# Python
__pycache__/
*.pyc
.venv/
*.egg-info/
backend/chroma_db/

# Node
node_modules/
frontend/dist/
frontend/.env

# OS
.DS_Store
```

**Step 3: Créer `backend/requirements.txt`**

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
pydantic==2.8.0
langchain==0.3.0
langchain-community==0.3.0
chromadb==0.5.0
sentence-transformers==3.1.0
pypdf==4.3.0
python-multipart==0.0.9
pytest==8.3.0
httpx==0.27.0
pytest-asyncio==0.24.0
```

**Step 4: Créer `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import classification, rag

app = FastAPI(title="BNP Incident Notification Tool")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(classification.router, prefix="/api")
app.include_router(rag.router, prefix="/api")
```

**Step 5: Créer `backend/app/__init__.py`** (vide)

**Step 6: Installer les dépendances backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Step 7: Scaffolder le frontend avec Vite**

```bash
cd ../frontend
npm create vite@latest . -- --template react-ts
npm install
npm install @tanstack/react-query axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 8: Installer shadcn/ui**

```bash
npx shadcn@latest init
# Choisir: Default style, Zinc color, CSS variables: yes
npx shadcn@latest add button card checkbox label progress badge textarea separator
```

**Step 9: Commit**

```bash
cd ..
git add .
git commit -m "feat: scaffold monorepo backend + frontend"
```

---

## Task 2 : Modèles Pydantic (schémas de données)

**Files:**
- Create: `backend/app/models/incident.py`
- Create: `backend/tests/test_models.py`

**Step 1: Écrire les tests**

```python
# backend/tests/test_models.py
import pytest
from app.models.incident import IncidentInput, ClassificationResult

def test_incident_input_requires_detection_datetime():
    with pytest.raises(Exception):
        IncidentInput()

def test_incident_input_defaults():
    from datetime import datetime
    incident = IncidentInput(
        detection_datetime=datetime.now(),
        incident_type="cyber",
        personal_data_involved=False,
    )
    assert incident.incident_type == "cyber"
    assert incident.personal_data_involved is False
    assert incident.primary_criteria == []
    assert incident.materiality_thresholds == []

def test_incident_type_enum_validation():
    from datetime import datetime
    with pytest.raises(Exception):
        IncidentInput(
            detection_datetime=datetime.now(),
            incident_type="invalid_type",
            personal_data_involved=False,
        )
```

**Step 2: Lancer les tests pour vérifier qu'ils échouent**

```bash
cd backend && source .venv/bin/activate
pytest tests/test_models.py -v
```
Expected: FAIL avec `ModuleNotFoundError`

**Step 3: Créer `backend/app/models/incident.py`**

```python
from datetime import datetime
from enum import Enum
from pydantic import BaseModel

class IncidentType(str, Enum):
    CYBER = "cyber"
    OPERATIONAL = "operational"
    PAYMENT = "payment"

class PrimaryCriterion(str, Enum):
    CRITICAL_FUNCTIONS = "critical_functions"
    SUPERVISED_FINANCIAL = "supervised_financial"
    MALICIOUS_ACCESS = "malicious_access"

class MaterialityThreshold(str, Enum):
    CLIENTS = "clients"
    REPUTATIONAL = "reputational"
    DURATION = "duration"
    GEOGRAPHIC = "geographic"
    ECONOMIC = "economic"
    DATA_LOSS = "data_loss"

class IncidentInput(BaseModel):
    detection_datetime: datetime
    incident_type: IncidentType
    personal_data_involved: bool
    primary_criteria: list[PrimaryCriterion] = []
    materiality_thresholds: list[MaterialityThreshold] = []
    is_recurring: bool = False
    # RGPD
    rgpd_q1_is_personal_breach: bool | None = None
    rgpd_q2_risk_rights: bool | None = None
    rgpd_q3_high_risk: bool | None = None
    rgpd_q4_exemption: bool | None = None
    # LOPMI
    lopmi_intrusion_confirmed: bool | None = None
    # Contexte libre
    description: str = ""

class DeadlineAction(BaseModel):
    action: str
    delay_hours: int | None = None
    delay_label: str
    regulation: str

class RegulationResult(BaseModel):
    applicable: bool
    is_major: bool = False
    level: str = "none"  # "major", "significant", "minor", "none"
    actions: list[DeadlineAction] = []
    reasoning: str = ""

class ClassificationResult(BaseModel):
    dora: RegulationResult
    rgpd: RegulationResult
    lopmi: RegulationResult
    global_level: str  # "major", "significant", "minor", "none"
    first_deadline_hours: int | None
```

**Step 4: Créer `backend/app/models/__init__.py`** (vide)

**Step 5: Lancer les tests**

```bash
pytest tests/test_models.py -v
```
Expected: PASS (3 tests)

**Step 6: Commit**

```bash
git add backend/app/models/ backend/tests/test_models.py
git commit -m "feat: add Pydantic models for incident classification"
```

---

## Task 3 : Moteur de classification DORA

**Files:**
- Create: `backend/app/services/classifier.py`
- Create: `backend/tests/test_classifier_dora.py`

**Step 1: Écrire les tests DORA**

```python
# backend/tests/test_classifier_dora.py
import pytest
from datetime import datetime
from app.models.incident import IncidentInput, IncidentType, PrimaryCriterion, MaterialityThreshold
from app.services.classifier import classify_dora

def make_incident(**kwargs):
    defaults = dict(
        detection_datetime=datetime.now(),
        incident_type=IncidentType.CYBER,
        personal_data_involved=False,
    )
    defaults.update(kwargs)
    return IncidentInput(**defaults)

def test_dora_major_with_1_primary_and_2_thresholds():
    incident = make_incident(
        primary_criteria=[PrimaryCriterion.CRITICAL_FUNCTIONS],
        materiality_thresholds=[MaterialityThreshold.CLIENTS, MaterialityThreshold.DURATION],
    )
    result = classify_dora(incident)
    assert result.applicable is True
    assert result.is_major is True
    assert result.level == "major"
    assert len(result.actions) == 3  # rapport initial, intermédiaire, final

def test_dora_not_major_with_1_primary_and_1_threshold():
    incident = make_incident(
        primary_criteria=[PrimaryCriterion.CRITICAL_FUNCTIONS],
        materiality_thresholds=[MaterialityThreshold.CLIENTS],
    )
    result = classify_dora(incident)
    assert result.is_major is False

def test_dora_major_auto_malicious_access_with_data_loss():
    incident = make_incident(
        primary_criteria=[PrimaryCriterion.MALICIOUS_ACCESS],
        materiality_thresholds=[MaterialityThreshold.DATA_LOSS],
    )
    result = classify_dora(incident)
    assert result.is_major is True

def test_dora_actions_have_correct_deadlines():
    incident = make_incident(
        primary_criteria=[PrimaryCriterion.CRITICAL_FUNCTIONS],
        materiality_thresholds=[MaterialityThreshold.CLIENTS, MaterialityThreshold.ECONOMIC],
    )
    result = classify_dora(incident)
    delay_labels = [a.delay_label for a in result.actions]
    assert "4h" in delay_labels
    assert "72h" in delay_labels
    assert "1 mois" in delay_labels

def test_dora_major_recurring():
    incident = make_incident(
        primary_criteria=[PrimaryCriterion.CRITICAL_FUNCTIONS],
        materiality_thresholds=[MaterialityThreshold.CLIENTS, MaterialityThreshold.REPUTATIONAL],
        is_recurring=True,
    )
    result = classify_dora(incident)
    assert result.is_major is True

def test_dora_always_applicable():
    incident = make_incident(
        incident_type=IncidentType.OPERATIONAL,
    )
    result = classify_dora(incident)
    assert result.applicable is True
```

**Step 2: Lancer pour vérifier l'échec**

```bash
pytest tests/test_classifier_dora.py -v
```
Expected: FAIL avec `ImportError`

**Step 3: Créer `backend/app/services/classifier.py`**

```python
from datetime import datetime
from app.models.incident import (
    IncidentInput, IncidentType, PrimaryCriterion, MaterialityThreshold,
    RegulationResult, DeadlineAction, ClassificationResult
)


def classify_dora(incident: IncidentInput) -> RegulationResult:
    has_primary = len(incident.primary_criteria) >= 1
    has_two_thresholds = len(incident.materiality_thresholds) >= 2

    # Cas automatique : accès malveillant + perte de données
    auto_major = (
        PrimaryCriterion.MALICIOUS_ACCESS in incident.primary_criteria
        and MaterialityThreshold.DATA_LOSS in incident.materiality_thresholds
    )

    is_major = (has_primary and has_two_thresholds) or auto_major or (
        incident.is_recurring and has_primary and has_two_thresholds
    )

    actions = []
    if is_major:
        actions = [
            DeadlineAction(
                action="Soumettre le rapport initial à l'ACPR",
                delay_hours=4,
                delay_label="4h",
                regulation="DORA",
            ),
            DeadlineAction(
                action="Soumettre le rapport intermédiaire à l'ACPR",
                delay_hours=72,
                delay_label="72h",
                regulation="DORA",
            ),
            DeadlineAction(
                action="Soumettre le rapport final à l'ACPR",
                delay_hours=None,
                delay_label="1 mois",
                regulation="DORA",
            ),
        ]

    return RegulationResult(
        applicable=True,
        is_major=is_major,
        level="major" if is_major else "minor",
        actions=actions,
        reasoning=(
            "L'incident satisfait ≥1 critère primaire et ≥2 seuils de matérialité."
            if is_major else
            "L'incident ne satisfait pas les conditions de qualification en incident majeur DORA."
        ),
    )


def classify_rgpd(incident: IncidentInput) -> RegulationResult:
    if not incident.personal_data_involved:
        return RegulationResult(applicable=False, level="none")

    if not incident.rgpd_q1_is_personal_breach:
        return RegulationResult(
            applicable=True, level="none",
            reasoning="Pas une violation de données personnelles au sens RGPD."
        )

    if not incident.rgpd_q2_risk_rights:
        return RegulationResult(
            applicable=True, level="minor",
            actions=[DeadlineAction(
                action="Documenter l'incident en interne",
                delay_label="Sans délai",
                regulation="RGPD",
            )],
            reasoning="Pas de risque pour les droits et libertés : documentation interne uniquement."
        )

    # Risque identifié → notifier APD
    actions = [
        DeadlineAction(
            action="Notifier l'Autorité de Protection des Données compétente (ex: CNIL)",
            delay_hours=72,
            delay_label="72h",
            regulation="RGPD",
        ),
        DeadlineAction(
            action="Évaluer si d'autres autorités EEA/hors-EEA doivent être notifiées",
            delay_hours=72,
            delay_label="72h",
            regulation="RGPD",
        ),
    ]

    if incident.rgpd_q3_high_risk and not incident.rgpd_q4_exemption:
        actions.append(DeadlineAction(
            action="Notifier les personnes concernées (position Groupe BNP requise)",
            delay_label="Sans délai",
            regulation="RGPD",
        ))
        level = "major"
    else:
        level = "significant"

    return RegulationResult(
        applicable=True,
        is_major=level == "major",
        level=level,
        actions=actions,
        reasoning="Violation RGPD avec risque pour les droits et libertés des personnes."
    )


def classify_lopmi(incident: IncidentInput) -> RegulationResult:
    if incident.incident_type != IncidentType.CYBER:
        return RegulationResult(applicable=False, level="none")

    if not incident.lopmi_intrusion_confirmed:
        return RegulationResult(
            applicable=True, level="none",
            reasoning="Intrusion non confirmée : pas d'obligation de dépôt de plainte."
        )

    return RegulationResult(
        applicable=True,
        is_major=True,
        level="major",
        actions=[
            DeadlineAction(
                action="Déposer plainte auprès des autorités compétentes (modèle Sharepoint interne)",
                delay_hours=72,
                delay_label="72h",
                regulation="LOPMI",
            )
        ],
        reasoning="Intrusion avérée : dépôt de plainte obligatoire sous 72h pour activer la couverture assurance."
    )


def classify_incident(incident: IncidentInput) -> ClassificationResult:
    dora = classify_dora(incident)
    rgpd = classify_rgpd(incident)
    lopmi = classify_lopmi(incident)

    all_results = [dora, rgpd, lopmi]
    if any(r.level == "major" for r in all_results):
        global_level = "major"
    elif any(r.level == "significant" for r in all_results):
        global_level = "significant"
    elif any(r.level == "minor" for r in all_results):
        global_level = "minor"
    else:
        global_level = "none"

    all_actions = [a for r in all_results for a in r.actions]
    timed_actions = [a for a in all_actions if a.delay_hours is not None]
    first_deadline = min((a.delay_hours for a in timed_actions), default=None)

    return ClassificationResult(
        dora=dora,
        rgpd=rgpd,
        lopmi=lopmi,
        global_level=global_level,
        first_deadline_hours=first_deadline,
    )
```

**Step 4: Créer `backend/app/services/__init__.py`** (vide)

**Step 5: Lancer les tests**

```bash
pytest tests/test_classifier_dora.py -v
```
Expected: PASS (6 tests)

**Step 6: Commit**

```bash
git add backend/app/services/ backend/tests/test_classifier_dora.py
git commit -m "feat: add DORA/RGPD/LOPMI classification engine"
```

---

## Task 4 : Endpoint FastAPI `/classify`

**Files:**
- Create: `backend/app/routers/classification.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/tests/test_api_classification.py`

**Step 1: Écrire les tests API**

```python
# backend/tests/test_api_classification.py
import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime
from app.main import app

@pytest.fixture
def incident_payload():
    return {
        "detection_datetime": datetime.now().isoformat(),
        "incident_type": "cyber",
        "personal_data_involved": True,
        "primary_criteria": ["critical_functions"],
        "materiality_thresholds": ["clients", "duration"],
        "is_recurring": False,
        "rgpd_q1_is_personal_breach": True,
        "rgpd_q2_risk_rights": True,
        "rgpd_q3_high_risk": False,
        "rgpd_q4_exemption": None,
        "lopmi_intrusion_confirmed": True,
        "description": "Test incident",
    }

@pytest.mark.asyncio
async def test_classify_returns_200(incident_payload):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/classify", json=incident_payload)
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_classify_returns_correct_structure(incident_payload):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/classify", json=incident_payload)
    data = response.json()
    assert "dora" in data
    assert "rgpd" in data
    assert "lopmi" in data
    assert "global_level" in data
    assert data["global_level"] == "major"

@pytest.mark.asyncio
async def test_classify_invalid_incident_type(incident_payload):
    incident_payload["incident_type"] = "invalid"
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/classify", json=incident_payload)
    assert response.status_code == 422
```

**Step 2: Lancer pour vérifier l'échec**

```bash
pytest tests/test_api_classification.py -v
```
Expected: FAIL

**Step 3: Créer `backend/app/routers/classification.py`**

```python
from fastapi import APIRouter
from app.models.incident import IncidentInput, ClassificationResult
from app.services.classifier import classify_incident

router = APIRouter()

@router.post("/classify", response_model=ClassificationResult)
async def classify(incident: IncidentInput) -> ClassificationResult:
    return classify_incident(incident)
```

**Step 4: Créer `backend/app/routers/__init__.py`** (vide)

**Step 5: Créer `backend/tests/__init__.py`** (vide)

**Step 6: Configurer pytest pour asyncio dans `backend/pytest.ini`**

```ini
[pytest]
asyncio_mode = auto
```

**Step 7: Lancer les tests**

```bash
pytest tests/test_api_classification.py -v
```
Expected: PASS (3 tests)

**Step 8: Vérifier que le serveur démarre**

```bash
uvicorn app.main:app --reload --port 8000
# Ouvrir http://localhost:8000/docs
```

**Step 9: Commit**

```bash
git add backend/app/routers/ backend/tests/test_api_classification.py backend/pytest.ini backend/tests/__init__.py
git commit -m "feat: add POST /classify endpoint"
```

---

## Task 5 : Module RAG — Indexation des PDFs

**Files:**
- Create: `backend/app/services/rag_service.py`
- Create: `backend/app/routers/rag.py`
- Create: `backend/tests/test_rag.py`

**Step 1: Copier les PDFs dans `backend/data/docs/`**

```bash
cp "/Users/matthieu.kaeppelin/Documents/3-Cours/Master DS - X/Capstone/Guidelines DORA/DORA-CELEX_32022R2554_EN_TXT.pdf" backend/data/docs/
cp "/Users/matthieu.kaeppelin/Documents/3-Cours/Master DS - X/Capstone/Guidelines DORA/DORA-CELEX_32022R2554_FR_TXT.pdf" backend/data/docs/
```

**Step 2: Écrire les tests RAG**

```python
# backend/tests/test_rag.py
import pytest
from app.services.rag_service import RagService

@pytest.fixture(scope="module")
def rag():
    service = RagService(docs_path="data/docs", persist_path="data/chroma_test")
    service.index_documents()
    return service

def test_rag_returns_non_empty_answer(rag):
    result = rag.query("What are the reporting deadlines for major incidents under DORA?")
    assert isinstance(result["answer"], str)
    assert len(result["answer"]) > 10

def test_rag_returns_sources(rag):
    result = rag.query("What is a major incident under DORA?")
    assert "sources" in result
    assert len(result["sources"]) > 0

def test_rag_returns_source_with_document_name(rag):
    result = rag.query("Article 19 DORA notification")
    sources = result["sources"]
    assert any("DORA" in s.get("source", "") for s in sources)
```

**Step 3: Créer `backend/app/services/rag_service.py`**

```python
import os
from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.chains import RetrievalQA
from langchain_community.llms import HuggingFacePipeline
from langchain_core.prompts import PromptTemplate


class RagService:
    def __init__(
        self,
        docs_path: str = "data/docs",
        persist_path: str = "data/chroma_db",
        model_name: str = "BAAI/bge-small-en-v1.5",
    ):
        self.docs_path = Path(docs_path)
        self.persist_path = persist_path
        self.embeddings = HuggingFaceEmbeddings(model_name=model_name)
        self.vectorstore: Chroma | None = None

    def index_documents(self) -> None:
        """Indexe tous les PDFs du dossier docs."""
        docs = []
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)

        for pdf_path in self.docs_path.glob("*.pdf"):
            loader = PyPDFLoader(str(pdf_path))
            pages = loader.load()
            chunks = splitter.split_documents(pages)
            # Ajouter le nom du fichier source dans les métadonnées
            for chunk in chunks:
                chunk.metadata["source"] = pdf_path.name
            docs.extend(chunks)

        self.vectorstore = Chroma.from_documents(
            documents=docs,
            embedding=self.embeddings,
            persist_directory=self.persist_path,
        )

    def load_existing_index(self) -> None:
        """Charge un index ChromaDB existant."""
        self.vectorstore = Chroma(
            persist_directory=self.persist_path,
            embedding_function=self.embeddings,
        )

    def query(self, question: str, k: int = 4) -> dict:
        """Recherche les passages pertinents et retourne la réponse avec sources."""
        if self.vectorstore is None:
            raise RuntimeError("Index non chargé. Appelez index_documents() ou load_existing_index() d'abord.")

        retriever = self.vectorstore.as_retriever(search_kwargs={"k": k})
        docs = retriever.get_relevant_documents(question)

        # Construire le contexte à partir des passages récupérés
        context = "\n\n---\n\n".join([d.page_content for d in docs])
        sources = [
            {"source": d.metadata.get("source", ""), "page": d.metadata.get("page", "")}
            for d in docs
        ]

        # Réponse simple basée sur les extraits (sans LLM local pour V1)
        answer = f"Passages pertinents trouvés dans les documents réglementaires :\n\n{context[:2000]}"

        return {"answer": answer, "sources": sources, "context": context}


# Instance singleton initialisée au démarrage
_rag_service: RagService | None = None


def get_rag_service() -> RagService:
    global _rag_service
    if _rag_service is None:
        _rag_service = RagService()
        index_path = Path("data/chroma_db")
        if index_path.exists() and any(index_path.iterdir()):
            _rag_service.load_existing_index()
        else:
            _rag_service.index_documents()
    return _rag_service
```

**Step 4: Créer `backend/app/routers/rag.py`**

```python
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
    result = rag.query(query)
    return ChatResponse(answer=result["answer"], sources=result["sources"])
```

**Step 5: Lancer l'indexation (première fois, peut prendre quelques minutes)**

```bash
cd backend && source .venv/bin/activate
python -c "
from app.services.rag_service import RagService
svc = RagService()
svc.index_documents()
print('Indexation terminée')
"
```

**Step 6: Lancer les tests RAG**

```bash
pytest tests/test_rag.py -v
```
Expected: PASS (3 tests)

**Step 7: Commit**

```bash
git add backend/app/services/rag_service.py backend/app/routers/rag.py backend/tests/test_rag.py backend/data/docs/
git commit -m "feat: add RAG service with PDF indexing and /chat endpoint"
```

---

## Task 6 : Frontend — Setup et layout principal

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/lib/api.ts`
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/index.css`

**Step 1: Configurer Tailwind dans `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 2: Créer `frontend/src/lib/api.ts`**

```typescript
import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000/api" });

export interface IncidentInput {
  detection_datetime: string;
  incident_type: "cyber" | "operational" | "payment";
  personal_data_involved: boolean;
  primary_criteria: string[];
  materiality_thresholds: string[];
  is_recurring: boolean;
  rgpd_q1_is_personal_breach?: boolean | null;
  rgpd_q2_risk_rights?: boolean | null;
  rgpd_q3_high_risk?: boolean | null;
  rgpd_q4_exemption?: boolean | null;
  lopmi_intrusion_confirmed?: boolean | null;
  description: string;
}

export interface DeadlineAction {
  action: string;
  delay_hours: number | null;
  delay_label: string;
  regulation: string;
}

export interface RegulationResult {
  applicable: boolean;
  is_major: boolean;
  level: string;
  actions: DeadlineAction[];
  reasoning: string;
}

export interface ClassificationResult {
  dora: RegulationResult;
  rgpd: RegulationResult;
  lopmi: RegulationResult;
  global_level: string;
  first_deadline_hours: number | null;
}

export const classifyIncident = async (
  input: IncidentInput
): Promise<ClassificationResult> => {
  const { data } = await api.post<ClassificationResult>("/classify", input);
  return data;
};

export const chatWithAgent = async (
  question: string,
  incidentContext: string = ""
): Promise<{ answer: string; sources: Array<{ source: string; page: string }> }> => {
  const { data } = await api.post("/chat", {
    question,
    incident_context: incidentContext,
  });
  return data;
};
```

**Step 3: Créer `frontend/src/App.tsx`**

```tsx
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import IncidentWizard from "./components/wizard/IncidentWizard";
import ResultsDashboard from "./components/results/ResultsDashboard";
import type { ClassificationResult, IncidentInput } from "./lib/api";

const queryClient = new QueryClient();

export default function App() {
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [incidentData, setIncidentData] = useState<IncidentInput | null>(null);

  const handleClassified = (res: ClassificationResult, data: IncidentInput) => {
    setResult(res);
    setIncidentData(data);
  };

  const handleReset = () => {
    setResult(null);
    setIncidentData(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
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
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8">
          {result === null ? (
            <IncidentWizard onClassified={handleClassified} />
          ) : (
            <ResultsDashboard
              result={result}
              incidentData={incidentData!}
              onReset={handleReset}
            />
          )}
        </main>
      </div>
    </QueryClientProvider>
  );
}
```

**Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/lib/api.ts frontend/src/index.css
git commit -m "feat: add frontend layout and API client"
```

---

## Task 7 : Frontend — Wizard formulaire (5 étapes)

**Files:**
- Create: `frontend/src/components/wizard/IncidentWizard.tsx`
- Create: `frontend/src/components/wizard/Step1Triage.tsx`
- Create: `frontend/src/components/wizard/Step2Dora.tsx`
- Create: `frontend/src/components/wizard/Step3Rgpd.tsx`
- Create: `frontend/src/components/wizard/Step4Lopmi.tsx`
- Create: `frontend/src/components/wizard/Step5Context.tsx`
- Create: `frontend/src/components/wizard/useWizard.ts`

**Step 1: Créer `frontend/src/components/wizard/useWizard.ts`**

```typescript
import { useState } from "react";
import type { IncidentInput } from "../../lib/api";

export type WizardData = Partial<IncidentInput> & {
  detection_datetime: string;
  incident_type: "cyber" | "operational" | "payment";
  personal_data_involved: boolean;
};

const initialData: WizardData = {
  detection_datetime: new Date().toISOString().slice(0, 16),
  incident_type: "cyber",
  personal_data_involved: false,
  primary_criteria: [],
  materiality_thresholds: [],
  is_recurring: false,
  description: "",
};

export function useWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);

  const update = (fields: Partial<WizardData>) =>
    setData((prev) => ({ ...prev, ...fields }));

  const totalSteps = () => {
    let steps = 3; // 1 triage, 2 DORA, 5 context
    if (data.personal_data_involved) steps++; // +1 RGPD
    if (data.incident_type === "cyber") steps++; // +1 LOPMI
    return steps;
  };

  const getStepOrder = () => {
    const steps = [1, 2];
    if (data.personal_data_involved) steps.push(3);
    if (data.incident_type === "cyber") steps.push(4);
    steps.push(5);
    return steps;
  };

  const nextStep = () => {
    const order = getStepOrder();
    const idx = order.indexOf(step);
    if (idx < order.length - 1) setStep(order[idx + 1]);
  };

  const prevStep = () => {
    const order = getStepOrder();
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  };

  const isLastStep = () => {
    const order = getStepOrder();
    return step === order[order.length - 1];
  };

  const progress = () => {
    const order = getStepOrder();
    return ((order.indexOf(step) + 1) / order.length) * 100;
  };

  return { step, data, update, nextStep, prevStep, isLastStep, progress, totalSteps };
}
```

**Step 2: Créer `frontend/src/components/wizard/Step1Triage.tsx`**

```tsx
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { WizardData } from "./useWizard";

interface Props {
  data: WizardData;
  update: (fields: Partial<WizardData>) => void;
}

const INCIDENT_TYPES = [
  { value: "cyber", label: "Cyberattaque / intrusion malveillante", tag: "→ active LOPMI" },
  { value: "operational", label: "Incident opérationnel non malveillant", tag: "" },
  { value: "payment", label: "Incident sur service de paiement", tag: "" },
] as const;

export default function Step1Triage({ data, update }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="detection_datetime">Date et heure de détection</Label>
        <input
          id="detection_datetime"
          type="datetime-local"
          className="w-full border rounded px-3 py-2 text-sm"
          value={data.detection_datetime}
          onChange={(e) => update({ detection_datetime: e.target.value })}
        />
      </div>

      <div className="space-y-3">
        <Label>Nature de l'incident</Label>
        {INCIDENT_TYPES.map((type) => (
          <div
            key={type.value}
            onClick={() => update({ incident_type: type.value })}
            className={`flex items-center justify-between border rounded-lg p-4 cursor-pointer transition-colors ${
              data.incident_type === type.value
                ? "border-green-700 bg-green-50"
                : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <span className="text-sm font-medium">{type.label}</span>
            {type.tag && (
              <span className="text-xs text-green-700 font-medium">{type.tag}</span>
            )}
          </div>
        ))}
      </div>

      <div
        className={`flex items-center justify-between border rounded-lg p-4 cursor-pointer transition-colors ${
          data.personal_data_involved
            ? "border-green-700 bg-green-50"
            : "border-gray-200 hover:border-gray-400"
        }`}
        onClick={() => update({ personal_data_involved: !data.personal_data_involved })}
      >
        <div>
          <p className="text-sm font-medium">
            Des données personnelles sont-elles potentiellement affectées ?
          </p>
          <p className="text-xs text-gray-500 mt-1">→ active l'analyse RGPD</p>
        </div>
        <Checkbox checked={data.personal_data_involved} />
      </div>
    </div>
  );
}
```

**Step 3: Créer `frontend/src/components/wizard/Step2Dora.tsx`**

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { WizardData } from "./useWizard";

const PRIMARY = [
  { value: "critical_functions", label: "Affecte des services/systèmes ICT supportant des fonctions critiques ou importantes" },
  { value: "supervised_financial", label: "Affecte des services financiers soumis à autorisation, enregistrement ou supervision" },
  { value: "malicious_access", label: "Constitue un accès réussi, malveillant et non autorisé aux systèmes" },
];

const THRESHOLDS = [
  { value: "clients", label: "Impact sur clients, contreparties financières ou transactions" },
  { value: "reputational", label: "Impact réputationnel (médias, plaintes, régulateur)" },
  { value: "duration", label: "Durée > 24h ou indisponibilité service critique > 2h" },
  { value: "geographic", label: "Impact dans ≥ 2 États membres de l'UE" },
  { value: "economic", label: "Impact économique estimé > 100 000€" },
  { value: "data_loss", label: "Perte ou impact sur l'intégrité / disponibilité / confidentialité des données" },
];

interface Props {
  data: WizardData;
  update: (fields: Partial<WizardData>) => void;
}

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

export default function Step2Dora({ data, update }: Props) {
  const primary = data.primary_criteria ?? [];
  const thresholds = data.materiality_thresholds ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-semibold">
          Critère primaire — cocher au moins 1
        </Label>
        {PRIMARY.map((c) => (
          <div key={c.value} className="flex items-start gap-3">
            <Checkbox
              id={c.value}
              checked={primary.includes(c.value)}
              onCheckedChange={() =>
                update({ primary_criteria: toggle(primary, c.value) })
              }
            />
            <Label htmlFor={c.value} className="text-sm leading-snug cursor-pointer">
              {c.label}
            </Label>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold">
          Seuils de matérialité — cocher ≥ 2 pour qualification "majeur"
        </Label>
        <p className="text-xs text-gray-500">
          Seuils cochés : {thresholds.length}/6
        </p>
        {THRESHOLDS.map((t) => (
          <div key={t.value} className="flex items-start gap-3">
            <Checkbox
              id={t.value}
              checked={thresholds.includes(t.value)}
              onCheckedChange={() =>
                update({ materiality_thresholds: toggle(thresholds, t.value) })
              }
            />
            <Label htmlFor={t.value} className="text-sm leading-snug cursor-pointer">
              {t.label}
            </Label>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 border rounded-lg p-3 bg-amber-50 border-amber-200">
        <Checkbox
          id="is_recurring"
          checked={data.is_recurring}
          onCheckedChange={(v) => update({ is_recurring: !!v })}
        />
        <Label htmlFor="is_recurring" className="text-sm cursor-pointer">
          Incident récurrent : s'est produit 2 fois en 6 mois avec la même cause racine apparente
        </Label>
      </div>
    </div>
  );
}
```

**Step 4: Créer `frontend/src/components/wizard/Step3Rgpd.tsx`**

```tsx
import { Label } from "@/components/ui/label";
import type { WizardData } from "./useWizard";

interface Props {
  data: WizardData;
  update: (fields: Partial<WizardData>) => void;
}

function YesNo({ id, label, value, onChange }: {
  id: string; label: string;
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-3">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`px-6 py-2 rounded-lg border text-sm font-medium transition-colors ${
              value === v
                ? "bg-green-700 text-white border-green-700"
                : "border-gray-300 hover:border-gray-500"
            }`}
          >
            {v ? "Oui" : "Non"}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Step3Rgpd({ data, update }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500 bg-gray-50 border rounded p-3">
        Arbre de décision RGPD — répondez aux questions dans l'ordre. Les questions suivantes
        apparaissent selon vos réponses.
      </p>

      <YesNo
        id="q1"
        label="Q1 — La violation est-elle une violation de données personnelles au sens du RGPD ?"
        value={data.rgpd_q1_is_personal_breach}
        onChange={(v) => update({ rgpd_q1_is_personal_breach: v })}
      />

      {data.rgpd_q1_is_personal_breach === false && (
        <p className="text-sm text-gray-600 bg-gray-50 border rounded p-3">
          ✓ Aucune notification RGPD requise. Documentation interne uniquement.
        </p>
      )}

      {data.rgpd_q1_is_personal_breach === true && (
        <YesNo
          id="q2"
          label="Q2 — La violation est-elle susceptible d'engendrer un risque pour les droits et libertés des personnes ?"
          value={data.rgpd_q2_risk_rights}
          onChange={(v) => update({ rgpd_q2_risk_rights: v })}
        />
      )}

      {data.rgpd_q2_risk_rights === false && (
        <p className="text-sm text-gray-600 bg-gray-50 border rounded p-3">
          ✓ Documentation interne uniquement. Pas de notification APD requise.
        </p>
      )}

      {data.rgpd_q2_risk_rights === true && (
        <>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
            ⚠ Notification de l'APD compétente (ex: CNIL) requise sous 72h.
            Évaluer si d'autres autorités EEA doivent être notifiées.
          </p>
          <YesNo
            id="q3"
            label="Q3 — La violation engendre-t-elle un risque ÉLEVÉ pour les droits et libertés des personnes ?"
            value={data.rgpd_q3_high_risk}
            onChange={(v) => update({ rgpd_q3_high_risk: v })}
          />
        </>
      )}

      {data.rgpd_q3_high_risk === true && (
        <div className="space-y-3">
          <Label className="text-sm">Q4 — Une exemption s'applique-t-elle ?</Label>
          {[
            "Données protégées par chiffrement fort",
            "Mesures prises pour neutraliser l'impact (ex: suspension des comptes affectés)",
            "Notification individuelle disproportionnée (→ avis public requis à la place)",
          ].map((ex) => (
            <div key={ex} className="text-sm text-gray-700 bg-gray-50 border rounded p-2">
              {ex}
            </div>
          ))}
          <div className="flex gap-3 mt-2">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => update({ rgpd_q4_exemption: v })}
                className={`px-6 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  data.rgpd_q4_exemption === v
                    ? "bg-green-700 text-white border-green-700"
                    : "border-gray-300 hover:border-gray-500"
                }`}
              >
                {v ? "Oui — exemption applicable" : "Non — pas d'exemption"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 5: Créer `frontend/src/components/wizard/Step4Lopmi.tsx`**

```tsx
import { Label } from "@/components/ui/label";
import type { WizardData } from "./useWizard";

interface Props {
  data: WizardData;
  update: (fields: Partial<WizardData>) => void;
}

export default function Step4Lopmi({ data, update }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-gray-50 border rounded p-3">
        La loi LOPMI impose le dépôt de plainte dans les 72h pour que la couverture
        assurance cyber soit activée en cas d'intrusion avérée.
      </p>

      <div className="space-y-2">
        <Label className="text-sm">
          L'intrusion dans les systèmes est-elle avérée et confirmée ?
        </Label>
        <div className="flex gap-3">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => update({ lopmi_intrusion_confirmed: v })}
              className={`px-6 py-2 rounded-lg border text-sm font-medium transition-colors ${
                data.lopmi_intrusion_confirmed === v
                  ? "bg-green-700 text-white border-green-700"
                  : "border-gray-300 hover:border-gray-500"
              }`}
            >
              {v ? "Oui" : "Non"}
            </button>
          ))}
        </div>
      </div>

      {data.lopmi_intrusion_confirmed === true && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          ⚠ Dépôt de plainte obligatoire sous 72h. Utiliser le modèle disponible sur le Sharepoint interne.
        </p>
      )}
    </div>
  );
}
```

**Step 6: Créer `frontend/src/components/wizard/Step5Context.tsx`**

```tsx
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WizardData } from "./useWizard";

interface Props {
  data: WizardData;
  update: (fields: Partial<WizardData>) => void;
}

export default function Step5Context({ data, update }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Description de l'incident</Label>
        <Textarea
          id="description"
          placeholder="Décrivez l'incident, les systèmes concernés, les premières constatations, les actions déjà engagées..."
          rows={8}
          value={data.description}
          onChange={(e) => update({ description: e.target.value })}
        />
      </div>
      <p className="text-xs text-gray-500">
        Ces informations seront utilisées pour contextualiser les recommandations du chatbot.
      </p>
    </div>
  );
}
```

**Step 7: Créer `frontend/src/components/wizard/IncidentWizard.tsx`**

```tsx
import { useMutation } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWizard } from "./useWizard";
import Step1Triage from "./Step1Triage";
import Step2Dora from "./Step2Dora";
import Step3Rgpd from "./Step3Rgpd";
import Step4Lopmi from "./Step4Lopmi";
import Step5Context from "./Step5Context";
import { classifyIncident, type ClassificationResult, type IncidentInput } from "../../lib/api";

const STEP_TITLES: Record<number, string> = {
  1: "Triage initial",
  2: "Critères DORA",
  3: "Analyse RGPD",
  4: "Analyse LOPMI",
  5: "Contexte de l'incident",
};

interface Props {
  onClassified: (result: ClassificationResult, data: IncidentInput) => void;
}

export default function IncidentWizard({ onClassified }: Props) {
  const { step, data, update, nextStep, prevStep, isLastStep, progress } = useWizard();

  const mutation = useMutation({
    mutationFn: () => classifyIncident(data as IncidentInput),
    onSuccess: (result) => onClassified(result, data as IncidentInput),
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>{STEP_TITLES[step]}</span>
          <span>{Math.round(progress())}%</span>
        </div>
        <Progress value={progress()} className="h-2" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{STEP_TITLES[step]}</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 1 && <Step1Triage data={data} update={update} />}
          {step === 2 && <Step2Dora data={data} update={update} />}
          {step === 3 && <Step3Rgpd data={data} update={update} />}
          {step === 4 && <Step4Lopmi data={data} update={update} />}
          {step === 5 && <Step5Context data={data} update={update} />}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={prevStep} disabled={step === 1}>
          Précédent
        </Button>
        {isLastStep() ? (
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-green-700 hover:bg-green-800"
          >
            {mutation.isPending ? "Analyse en cours..." : "Analyser l'incident"}
          </Button>
        ) : (
          <Button onClick={nextStep} className="bg-green-700 hover:bg-green-800">
            Suivant
          </Button>
        )}
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-600">
          Erreur lors de l'analyse. Vérifiez que le backend est démarré.
        </p>
      )}
    </div>
  );
}
```

**Step 8: Lancer le frontend et vérifier visuellement**

```bash
cd frontend && npm run dev
# Ouvrir http://localhost:5173
```

**Step 9: Commit**

```bash
git add frontend/src/components/wizard/
git commit -m "feat: add 5-step incident wizard with conditional branching"
```

---

## Task 8 : Frontend — Dashboard résultats

**Files:**
- Create: `frontend/src/components/results/ResultsDashboard.tsx`
- Create: `frontend/src/components/results/RegulationBlock.tsx`
- Create: `frontend/src/components/results/Countdown.tsx`

**Step 1: Créer `frontend/src/components/results/Countdown.tsx`**

```tsx
import { useEffect, useState } from "react";

interface Props {
  detectionDatetime: string;
  firstDeadlineHours: number | null;
}

export default function Countdown({ detectionDatetime, firstDeadlineHours }: Props) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!firstDeadlineHours) return;
    const deadline = new Date(detectionDatetime);
    deadline.setHours(deadline.getHours() + firstDeadlineHours);

    const update = () => {
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();
      if (diff <= 0) {
        setRemaining("DÉLAI DÉPASSÉ");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}min`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [detectionDatetime, firstDeadlineHours]);

  if (!firstDeadlineHours) return null;

  return (
    <div className="text-sm font-mono">
      <span className="text-white/70">Première deadline dans : </span>
      <span className="font-bold text-yellow-300">{remaining}</span>
    </div>
  );
}
```

**Step 2: Créer `frontend/src/components/results/RegulationBlock.tsx`**

```tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { RegulationResult } from "../../lib/api";

interface Props {
  title: string;
  result: RegulationResult;
}

const LEVEL_COLORS: Record<string, string> = {
  major: "bg-red-50 border-red-200",
  significant: "bg-amber-50 border-amber-200",
  minor: "bg-blue-50 border-blue-200",
  none: "bg-gray-50 border-gray-200",
};

const LEVEL_BADGE: Record<string, string> = {
  major: "bg-red-100 text-red-800",
  significant: "bg-amber-100 text-amber-800",
  minor: "bg-blue-100 text-blue-800",
  none: "bg-gray-100 text-gray-800",
};

const LEVEL_LABELS: Record<string, string> = {
  major: "Majeur",
  significant: "Significatif",
  minor: "Mineur",
  none: "Non applicable",
};

export default function RegulationBlock({ title, result }: Props) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (!result.applicable) return null;

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <Card className={`border ${LEVEL_COLORS[result.level]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge className={LEVEL_BADGE[result.level]}>
            {LEVEL_LABELS[result.level]}
          </Badge>
        </div>
        {result.reasoning && (
          <p className="text-xs text-gray-600 mt-1">{result.reasoning}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {result.actions.map((action, i) => (
          <div key={i} className="flex items-start gap-3">
            <Checkbox
              id={`action-${title}-${i}`}
              checked={checked.has(i)}
              onCheckedChange={() => toggle(i)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <label
                htmlFor={`action-${title}-${i}`}
                className={`text-sm cursor-pointer ${checked.has(i) ? "line-through text-gray-400" : ""}`}
              >
                {action.action}
              </label>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              {action.delay_label}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

**Step 3: Créer `frontend/src/components/results/ResultsDashboard.tsx`**

```tsx
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RegulationBlock from "./RegulationBlock";
import Countdown from "./Countdown";
import Chatbot from "../chatbot/Chatbot";
import type { ClassificationResult, IncidentInput } from "../../lib/api";

interface Props {
  result: ClassificationResult;
  incidentData: IncidentInput;
  onReset: () => void;
}

const GLOBAL_COLORS: Record<string, string> = {
  major: "bg-red-700",
  significant: "bg-amber-600",
  minor: "bg-blue-600",
  none: "bg-gray-600",
};

const GLOBAL_LABELS: Record<string, string> = {
  major: "INCIDENT MAJEUR",
  significant: "INCIDENT SIGNIFICATIF",
  minor: "INCIDENT MINEUR",
  none: "NON QUALIFIÉ",
};

export default function ResultsDashboard({ result, incidentData, onReset }: Props) {
  const activeRegs = [
    result.dora.applicable && "DORA",
    result.rgpd.applicable && "RGPD",
    result.lopmi.applicable && "LOPMI",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      {/* Bandeau gravité */}
      <div className={`${GLOBAL_COLORS[result.global_level]} rounded-xl p-6 text-white space-y-2`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{GLOBAL_LABELS[result.global_level]}</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="text-white border-white/40 hover:bg-white/10"
          >
            Nouvel incident
          </Button>
        </div>
        <div className="flex gap-2">
          {activeRegs.map((reg) => (
            <Badge key={reg} className="bg-white/20 text-white border-white/30">
              {reg}
            </Badge>
          ))}
        </div>
        <Countdown
          detectionDatetime={incidentData.detection_datetime}
          firstDeadlineHours={result.first_deadline_hours}
        />
      </div>

      {/* Blocs par réglementation */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">Actions à mener</h3>
        <RegulationBlock title="DORA — Autorités de supervision" result={result.dora} />
        <RegulationBlock title="RGPD — Protection des données" result={result.rgpd} />
        <RegulationBlock title="LOPMI — Dépôt de plainte" result={result.lopmi} />
      </div>

      {/* Chatbot RAG */}
      <Chatbot incidentDescription={incidentData.description} />
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add frontend/src/components/results/
git commit -m "feat: add results dashboard with regulation blocks and countdown"
```

---

## Task 9 : Frontend — Chatbot RAG

**Files:**
- Create: `frontend/src/components/chatbot/Chatbot.tsx`

**Step 1: Créer `frontend/src/components/chatbot/Chatbot.tsx`**

```tsx
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chatWithAgent } from "../../lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ source: string; page: string }>;
}

interface Props {
  incidentDescription: string;
}

export default function Chatbot({ incidentDescription }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res = await chatWithAgent(question, incidentDescription);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer, sources: res.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erreur lors de la connexion au service RAG." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          💬 Assistant réglementaire — Questions sur cet incident
        </CardTitle>
        <p className="text-xs text-gray-500">
          Posez vos questions : les réponses sont basées sur les textes DORA, RGPD et LOPMI.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.length > 0 && (
          <div className="max-h-80 overflow-y-auto space-y-3 border rounded p-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`text-sm ${m.role === "user" ? "text-right" : ""}`}>
                <span
                  className={`inline-block px-3 py-2 rounded-lg max-w-[85%] text-left ${
                    m.role === "user"
                      ? "bg-green-700 text-white"
                      : "bg-white border text-gray-800"
                  }`}
                >
                  {m.content}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                      Sources : {m.sources.map((s) => `${s.source} p.${s.page}`).join(", ")}
                    </div>
                  )}
                </span>
              </div>
            ))}
            {loading && (
              <p className="text-xs text-gray-400 italic">Recherche en cours...</p>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: Quelles sont les obligations de notification DORA pour un incident majeur ?"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button
            onClick={send}
            disabled={loading || !input.trim()}
            className="bg-green-700 hover:bg-green-800 shrink-0"
          >
            Envoyer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/chatbot/
git commit -m "feat: add RAG chatbot component"
```

---

## Task 10 : Test d'intégration end-to-end + README

**Files:**
- Create: `README.md`
- Create: `backend/tests/test_integration.py`

**Step 1: Écrire le test d'intégration**

```python
# backend/tests/test_integration.py
import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime
from app.main import app

@pytest.mark.asyncio
async def test_full_cyber_incident_major():
    """Incident cyber majeur → DORA + RGPD + LOPMI tous activés."""
    payload = {
        "detection_datetime": datetime.now().isoformat(),
        "incident_type": "cyber",
        "personal_data_involved": True,
        "primary_criteria": ["critical_functions", "malicious_access"],
        "materiality_thresholds": ["clients", "duration", "data_loss"],
        "is_recurring": False,
        "rgpd_q1_is_personal_breach": True,
        "rgpd_q2_risk_rights": True,
        "rgpd_q3_high_risk": True,
        "rgpd_q4_exemption": False,
        "lopmi_intrusion_confirmed": True,
        "description": "Ransomware sur serveurs de production.",
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/classify", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["global_level"] == "major"
    assert data["dora"]["is_major"] is True
    assert data["rgpd"]["is_major"] is True
    assert data["lopmi"]["is_major"] is True
    assert data["first_deadline_hours"] == 4  # DORA rapport initial

@pytest.mark.asyncio
async def test_operational_incident_non_major():
    """Incident opérationnel sans données perso → seulement DORA non majeur."""
    payload = {
        "detection_datetime": datetime.now().isoformat(),
        "incident_type": "operational",
        "personal_data_involved": False,
        "primary_criteria": [],
        "materiality_thresholds": [],
        "is_recurring": False,
        "description": "Panne serveur de fichiers.",
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/classify", json=payload)

    data = response.json()
    assert data["dora"]["is_major"] is False
    assert data["rgpd"]["applicable"] is False
    assert data["lopmi"]["applicable"] is False
```

**Step 2: Lancer tous les tests**

```bash
cd backend && pytest tests/ -v
```
Expected: PASS (tous les tests)

**Step 3: Créer `README.md` à la racine**

```markdown
# BNP Incident Notification Tool

Outil de qualification et de notification d'incidents réglementaires pour les juristes
Digital & IP de BNP Paribas (DORA / RGPD / LOPMI).

## Lancement

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Tests
```bash
cd backend && pytest tests/ -v
```

## Accès

- Frontend : http://localhost:5173
- API docs : http://localhost:8000/docs
```

**Step 4: Commit final**

```bash
git add README.md backend/tests/test_integration.py
git commit -m "feat: add integration tests and README"
```

---

## Résumé des commits attendus

| Task | Commit |
|------|--------|
| 1 | `feat: scaffold monorepo backend + frontend` |
| 2 | `feat: add Pydantic models for incident classification` |
| 3 | `feat: add DORA/RGPD/LOPMI classification engine` |
| 4 | `feat: add POST /classify endpoint` |
| 5 | `feat: add RAG service with PDF indexing and /chat endpoint` |
| 6 | `feat: add frontend layout and API client` |
| 7 | `feat: add 5-step incident wizard with conditional branching` |
| 8 | `feat: add results dashboard with regulation blocks and countdown` |
| 9 | `feat: add RAG chatbot component` |
| 10 | `feat: add integration tests and README` |
