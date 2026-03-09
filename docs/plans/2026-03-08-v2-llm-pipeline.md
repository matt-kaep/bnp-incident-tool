# BNP Incident Tool V2 — LLM Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer le wizard statique 5 étapes + classifier déterministe par un pipeline LLM (Claude Haiku) qui génère dynamiquement des rounds de questions adaptées à l'incident, puis produit une classification réglementaire et une narrative explicative.

**Architecture:** Frontend stateless — tout l'historique de session vit dans le state React et est renvoyé à chaque appel backend. Le backend est un proxy entre le frontend et l'API Anthropic, avec injection du system prompt contenant toutes les règles métier. Trois endpoints : `/session/start`, `/session/continue`, `/session/refine`.

**Tech Stack:** Python 3.12 + FastAPI + `anthropic` SDK (Haiku), React 18 + TypeScript + TanStack Query, composants shadcn/ui existants réutilisés.

---

## Task 1: Backend — Dépendances et configuration

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/.env` (local, non committé)

**Step 1: Ajouter la dépendance anthropic dans requirements.txt**

Ajouter à la fin de `backend/requirements.txt` :
```
anthropic>=0.40.0
python-dotenv>=1.0.0
```

**Step 2: Créer le fichier .env.example**

Créer `backend/.env.example` :
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
LLM_MODEL=claude-haiku-4-5-20251001
```

**Step 3: Créer le fichier .env local**

Créer `backend/.env` avec la vraie clé API Anthropic.

**Step 4: Installer les dépendances**

```bash
cd backend
pip install anthropic python-dotenv
```

Expected output: Successfully installed anthropic-X.X.X

**Step 5: Commit**

```bash
git add backend/requirements.txt backend/.env.example
git commit -m "chore: add anthropic SDK dependency"
```

---

## Task 2: Backend — Modèles Pydantic pour l'API session

**Files:**
- Create: `backend/app/models/session.py`

**Step 1: Créer le fichier models/session.py**

```python
# backend/app/models/session.py
from pydantic import BaseModel
from typing import Optional, Literal


class InitialForm(BaseModel):
    detection_datetime: str
    incident_types: list[str]  # ["cyber", "data_breach", "tech_failure"]
    entity_name: str
    entity_type: Optional[str] = None
    personal_data_involved: Optional[str] = None  # "yes" | "no" | "unknown"
    data_volume_estimate: Optional[str] = None
    cross_border: Optional[str] = None  # "yes" | "no" | "unknown"
    csirt_severity: Optional[str] = None  # "low" | "moderate" | "serious" | "extreme" | None
    servicenow_ticket: Optional[str] = None
    description: str = ""


class QuestionAnswer(BaseModel):
    question_id: str
    value: str  # "yes" | "no" | "unknown" | texte libre | liste séparée par virgules


class RoundHistory(BaseModel):
    round_number: int
    round_title: str
    questions_json: str  # JSON brut du round (pour repassage au LLM)
    answers: list[QuestionAnswer]


class SessionStartRequest(BaseModel):
    initial_form: InitialForm


class SessionContinueRequest(BaseModel):
    initial_form: InitialForm
    history: list[RoundHistory]
    current_answers: list[QuestionAnswer]


class SessionRefineRequest(BaseModel):
    classification_json: str  # JSON brut de la classification finale
    incident_description: str


# Réponses
class LLMRoundResponse(BaseModel):
    done: bool
    raw_json: str  # JSON brut retourné par le LLM, parsé côté frontend
```

**Step 2: Commit**

```bash
git add backend/app/models/session.py
git commit -m "feat: add session Pydantic models"
```

---

## Task 3: Backend — System prompt builder

**Files:**
- Create: `backend/app/services/prompt_builder.py`

**Step 1: Créer prompt_builder.py**

```python
# backend/app/services/prompt_builder.py

SYSTEM_PROMPT = """Tu es un assistant juridique expert en droit réglementaire bancaire pour BNP Paribas (Direction Juridique Digital & IP). Tu qualifies des incidents de sécurité informatique selon trois réglementations : DORA, RGPD, et LOPMI.

TON RÔLE :
Tu poses des questions structurées par rounds pour collecter les informations nécessaires à la qualification réglementaire. Tu génères du JSON strict. Tu converges en 2-3 rounds maximum.

=== RÈGLES DORA ===
BNP Paribas est une entité financière supervisée soumise au règlement UE 2022/2554. L'analyse DORA s'applique à TOUT incident.

INCIDENT MAJEUR si :
- Condition A : (≥1 critère primaire) ET (≥2 seuils de matérialité)
- Condition B (auto-majeur) : accès malveillant réussi (P3) ET perte/atteinte aux données (M6) — qualification automatique sans vérification des autres seuils
- Condition C : incident récurrent (même cause racine, ≥2 fois en 6 mois) satisfaisant A ou B

Critères primaires (≥1 requis) :
P1. Fonctions critiques ou importantes affectées (systèmes ICT supportant des fonctions critiques de BNP)
P2. Services financiers supervisés affectés (services sous autorisation/enregistrement réglementaire)
P3. Accès malveillant réussi et non autorisé aux systèmes d'information

Seuils de matérialité (≥2 requis pour condition A) :
M1. Impact clients/contreparties : impact mesurable sur clients, contreparties financières ou transactions
M2. Réputationnel : couverture médiatique négative, plaintes, contact régulateur
M3. Durée : incident >24h OU service critique indisponible >2h
M4. Géographique : impact dans ≥2 États membres UE
M5. Économique : pertes estimées >100 000€
M6. Perte de données : atteinte à l'intégrité, disponibilité ou confidentialité des données

Si non majeur → niveau "mineur" (suivi interne, pas de notification immédiate)

Deadlines si majeur :
- Rapport initial → ACPR dans les 4 heures
- Rapport intermédiaire → ACPR dans les 72 heures
- Rapport final → ACPR sous 1 mois (720 heures)

=== RÈGLES RGPD ===
L'analyse RGPD s'active uniquement si des données personnelles sont potentiellement affectées.

Arbre de décision (Articles 33 et 34 RGPD) :
Q1 : Est-ce une violation de données personnelles au sens RGPD ? (destruction, perte, altération, divulgation non autorisée, accès non autorisé à des données personnelles)
→ Non : documentation interne uniquement. level = "non_applicable"
→ Oui : continuer

Q2 : La violation est-elle susceptible d'engendrer un risque pour les droits et libertés des personnes ?
→ Non : documentation interne uniquement. level = "mineur"
→ Oui : NOTIFICATION CNIL (et autorités EEA concernées) dans les 72h obligatoire. level = "significatif" minimum. Continuer.

Q3 : Y a-t-il un risque ÉLEVÉ pour les droits et libertés ?
→ Non : arrêt. level = "significatif"
→ Oui : continuer

Q4 : Une exemption s'applique-t-elle ?
  • Données protégées par chiffrement fort conforme à l'état de la technique, appliqué par BNP Paribas comme responsable de traitement (pas par l'attaquant)
  • Mesures correctives prises neutralisant l'impact pour les personnes concernées
  • Notification individuelle disproportionnée → avis public à la place
→ Oui : pas de notification individuelle. level = "significatif"
→ Non : NOTIFICATION DES PERSONNES CONCERNÉES sans délai (validation position Groupe BNP requise). level = "majeur"

SCORING DBRA (Personal Data Breach Risk Assessment) — pour contextualiser la gravité :
Score de base = 0
+ Action malveillante confirmée : +100
+ Données financières (IBAN, numéros de carte, transactions) : +100
+ Données sensibles au sens RGPD (santé, origine raciale/ethnique, opinions politiques, biométriques, orientation sexuelle) : +200
+ Responsable de traitement = établissement financier : +20
- Données inintelligibles (chiffrement fort appliqué PAR BNP Paribas, pas par l'attaquant ransomware) : -900
- Facilité d'identification des personnes :
  * Null (identification impossible) : -850
  * Très faible : -750
  * Faible : -500
  * Moyenne : -200
  * Élevée : +80

Seuil notification APD (CNIL) : score > 0
Seuil notification individuelle (risque élevé) : score > 75

=== RÈGLES LOPMI ===
L'analyse LOPMI s'active uniquement pour les incidents de type Cyber Security Incident.
La loi LOPMI (2023) conditionne l'activation de la couverture assurance cyber au dépôt préalable d'une plainte pénale. Sans plainte, l'assureur peut refuser l'indemnisation.

Deux conditions CUMULATIVES pour l'obligation de plainte :
1. CONDITION LÉGALE : L'incident constitue une atteinte à un Système de Traitement Automatisé de Données (STAD) au sens des articles 323-1 à 323-3-1 du Code Pénal (accès frauduleux, maintien frauduleux, entrave au fonctionnement, introduction frauduleuse de données, faux informatiques)
2. CONDITION TEMPORELLE : La plainte doit être déposée dans les 72h à compter du moment où BNP Paribas a connaissance de l'atteinte (pas de la détection initiale, mais de la connaissance confirmée de l'intrusion)

Si les deux conditions sont remplies → PLAINTE OBLIGATOIRE dans les 72h (modèle disponible sur Sharepoint interne BNP — impliquer l'équipe assurance groupe)
Si non remplies → pas d'obligation LOPMI (surveiller l'évolution, réévaluer si intrusion confirmée)

Niveaux : conditions remplies → "majeur" ; sinon → "non_applicable"

Zone grise LOPMI : pour les incidents de type credential stuffing avec identifiants obtenus en dehors des systèmes BNP, la qualification STAD peut être incertaine — à évaluer avec les équipes CSIRT et juridique.

=== CATÉGORIES DE QUESTIONS LEG0115 ===
Explore ces domaines uniquement si pertinent pour le contexte spécifique. Ne pose pas tout systématiquement.

1. Nature précise : que s'est-il passé ? Quels systèmes ? Encore en cours ?
2. Entités/territoires : lignes métier, entités juridiques BNP, pays UE concernés (≥2 ?)
3. Impact opérationnel : interruptions, applications critiques (>2h ?), durée estimée, workarounds
4. Données affectées : type (perso/corporate/IP/MNPI), classification, volume (enregistrements, personnes)
5. Cause racine : identifiée ? Résolue ? Systémique ou one-off ? Récurrence (2x en 6 mois ?)
6. Fonctions déjà notifiées : CSIRT, DPO, RH, Communication, Assurance, Procurement
7. Notifications réglementaires déjà faites : régulateurs financiers, APDs, clients
8. Assurance cyber : activée ? Équipe assurance groupe impliquée ?
9. Plainte police : déjà déposée ? LOPMI applicable ?
10. Tiers : fournisseur/prestataire impliqué ? Quel contrat ?

=== FORMAT DE SORTIE STRICT ===

PENDANT LES ROUNDS (done = false) :
{
  "done": false,
  "round_title": "Titre descriptif du round",
  "questions": [
    {
      "id": "q_unique_id",
      "text": "Texte de la question en français",
      "type": "yes_no_unknown",
      "options": null,
      "importance": "critical",
      "if_unknown_impact": "Impact si réponse inconnue, ou null si peu critique"
    }
  ]
}

Types de questions :
- "yes_no_unknown" : boutons Oui / Non / Je ne sais pas
- "multi_select" : liste de cases à cocher, options dans le champ "options"
- "text" : saisie texte courte

QUAND PRÊT À CONCLURE (done = true) :
{
  "done": true,
  "classification": {
    "global_level": "majeur",
    "dora": {
      "level": "majeur",
      "applicable": true,
      "reasoning": "Explication détaillée des critères satisfaits (P1, P3, M1, M3, M6...)"
    },
    "rgpd": {
      "level": "significatif",
      "applicable": true,
      "reasoning": "Explication de l'arbre Q1→Q4 suivi avec les réponses reçues"
    },
    "lopmi": {
      "level": "non_applicable",
      "applicable": false,
      "reasoning": "Explication des conditions évaluées et pourquoi non applicable"
    }
  },
  "actions": [
    {
      "regulation": "DORA",
      "action": "Soumettre le rapport initial à l'ACPR",
      "deadline_hours": 4,
      "deadline_label": "4h",
      "done": false
    }
  ],
  "first_deadline_hours": 4,
  "unknown_impacts": [
    {
      "field": "Nom du champ manquant",
      "impact": "Conséquence concrète sur la qualification ou la précision du résultat",
      "action_required": "Qui contacter ou quelle démarche pour obtenir l'information"
    }
  ],
  "narrative": "4 à 5 paragraphes en français. Paragraphe 1 : résumé de l'incident et qualification globale. Paragraphe 2 : analyse DORA avec articles cités (Art. 17-20 DORA). Paragraphe 3 : analyse RGPD avec articles cités (Art. 33-34 RGPD). Paragraphe 4 : analyse LOPMI si applicable (Art. 323-1 à 323-3-1 Code Pénal). Paragraphe 5 : données manquantes, leur impact sur la qualification, et prochaines étapes prioritaires. Ton professionnel, juridique, précis."
}

=== INSTRUCTIONS DE CONVERGENCE ===
- Converge en 2-3 rounds MAXIMUM — ne dépasse jamais 3 rounds
- Pose 3 à 6 questions par round (jamais plus de 6)
- Passe à done: true dès que tu peux qualifier les 3 réglementations, même avec des incertitudes
- Les incertitudes restantes vont dans unknown_impacts, pas dans de nouveaux rounds
- global_level = max(dora.level, rgpd.level, lopmi.level) avec ordre : majeur > significatif > mineur > non_applicable (non_applicable < mineur)
- first_deadline_hours = délai en heures de la première action obligatoire (4 si DORA majeur, 72 sinon, null si tout mineur/non_applicable)

=== GESTION "JE NE SAIS PAS" ===
Pour chaque réponse "Je ne sais pas" sur un point critique :
- Ne pas poser de nouvelle question sur le même point dans le round suivant
- Inclure dans unknown_impacts l'impact concret et l'action pour obtenir l'info
- Qualification prudente par défaut : si doute sur données perso → supposer applicable pour RGPD ; si doute sur intrusion → ne pas qualifier LOPMI sans confirmation

RÉPONDS UNIQUEMENT AVEC DU JSON VALIDE. Aucun texte avant ou après le JSON.
"""


def build_initial_message(initial_form: dict) -> str:
    """Construit le message utilisateur pour le premier appel."""
    lines = ["=== FORMULAIRE INITIAL DE L'INCIDENT ===\n"]

    field_labels = {
        "detection_datetime": "Date et heure de détection",
        "incident_types": "Type(s) d'incident",
        "entity_name": "Entité BNP touchée",
        "entity_type": "Type d'entité",
        "personal_data_involved": "Données personnelles impliquées",
        "data_volume_estimate": "Volume estimé de données/personnes",
        "cross_border": "Impact transfrontalier (>1 pays UE)",
        "csirt_severity": "Sévérité CSIRT évaluée",
        "servicenow_ticket": "Ticket ServiceNow",
        "description": "Description libre / contexte",
    }

    for key, label in field_labels.items():
        value = initial_form.get(key)
        if value:
            if isinstance(value, list):
                value = ", ".join(value)
            lines.append(f"{label} : {value}")

    lines.append("\n=== COMMENCE LES QUESTIONS (ROUND 1) ===")
    lines.append("Génère le JSON du premier round de questions.")
    return "\n".join(lines)


def build_continue_message(history: list, current_answers: list) -> str:
    """Construit le message pour les rounds suivants."""
    lines = ["=== RÉPONSES AU ROUND PRÉCÉDENT ===\n"]

    for answer in current_answers:
        lines.append(f"Question {answer['question_id']} : {answer['value']}")

    lines.append("\n=== GÉNÈRE LE ROUND SUIVANT OU LA CLASSIFICATION FINALE ===")
    lines.append("Si tu as assez d'informations, passe à done: true avec la classification complète.")
    lines.append("Sinon, génère le round suivant (maximum 3 rounds au total).")

    round_count = len(history) + 1
    lines.append(f"Round actuel : {round_count}/3. {'DERNIER ROUND POSSIBLE — tu DOIS conclure avec done: true.' if round_count >= 3 else ''}")

    return "\n".join(lines)
```

**Step 2: Commit**

```bash
git add backend/app/services/prompt_builder.py
git commit -m "feat: add system prompt builder with full regulatory rules"
```

---

## Task 4: Backend — LLM Service (Haiku)

**Files:**
- Create: `backend/app/services/llm_service.py`

**Step 1: Créer llm_service.py**

```python
# backend/app/services/llm_service.py
import json
import os
from anthropic import Anthropic
from app.services.prompt_builder import (
    SYSTEM_PROMPT,
    build_initial_message,
    build_continue_message,
)

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = os.getenv("LLM_MODEL", "claude-haiku-4-5-20251001")


def _build_conversation_messages(history: list, current_user_message: str) -> list:
    """Reconstruit les messages de conversation à partir de l'historique."""
    messages = []

    for round_entry in history:
        # Message LLM (assistant) — le JSON du round
        messages.append({
            "role": "assistant",
            "content": round_entry["questions_json"]
        })
        # Message utilisateur — les réponses
        answers_text = "\n".join(
            f"Question {a['question_id']} : {a['value']}"
            for a in round_entry["answers"]
        )
        messages.append({
            "role": "user",
            "content": f"=== RÉPONSES ===\n{answers_text}"
        })

    # Message utilisateur courant
    messages.append({
        "role": "user",
        "content": current_user_message
    })

    return messages


def start_session(initial_form: dict) -> dict:
    """Premier appel — génère le Round 1 de questions."""
    user_message = build_initial_message(initial_form)

    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}]
    )

    raw = response.content[0].text.strip()
    parsed = json.loads(raw)
    return {"done": parsed.get("done", False), "raw_json": raw}


def continue_session(initial_form: dict, history: list, current_answers: list) -> dict:
    """Rounds suivants — continue la conversation avec l'historique complet."""
    # Premier message = formulaire initial
    initial_message = build_initial_message(initial_form)

    # Historique complet
    messages = _build_conversation_messages(
        history,
        build_continue_message(history, current_answers)
    )

    # Insérer le message initial en premier
    messages = [{"role": "user", "content": initial_message}] + messages

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=messages
    )

    raw = response.content[0].text.strip()
    parsed = json.loads(raw)
    return {"done": parsed.get("done", False), "raw_json": raw}


def refine_with_rag(classification_json: str, rag_excerpts: list[str]) -> str:
    """Régénère la narrative en enrichissant avec des extraits RAG."""
    excerpts_text = "\n\n---\n\n".join(
        f"Extrait réglementaire ({i+1}) :\n{exc}"
        for i, exc in enumerate(rag_excerpts)
    )

    user_message = f"""Tu as produit cette classification :

{classification_json}

Voici des extraits des textes officiels (DORA, RGPD, LOPMI) récupérés par recherche sémantique :

{excerpts_text}

Régénère UNIQUEMENT le champ "narrative" de la classification, enrichi avec des citations précises des articles et extraits fournis. Retourne uniquement la nouvelle narrative en texte brut (pas de JSON), en 5-6 paragraphes. Cite les numéros d'articles précis quand tu t'y réfères."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system="Tu es un assistant juridique expert BNP Paribas spécialisé en DORA, RGPD et LOPMI. Tu rédiges des analyses juridiques précises en citant les textes de loi.",
        messages=[{"role": "user", "content": user_message}]
    )

    return response.content[0].text.strip()
```

**Step 2: Vérifier que le module s'importe sans erreur**

```bash
cd backend
python -c "from app.services.llm_service import start_session; print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add backend/app/services/llm_service.py
git commit -m "feat: add LLM service with Haiku API integration"
```

---

## Task 5: Backend — Router session

**Files:**
- Create: `backend/app/routers/session.py`

**Step 1: Créer session.py**

```python
# backend/app/routers/session.py
import json
import os
from fastapi import APIRouter, HTTPException
from app.models.session import (
    SessionStartRequest,
    SessionContinueRequest,
    SessionRefineRequest,
    LLMRoundResponse,
)
from app.services import llm_service
from app.services.rag_service import RagService

router = APIRouter()
rag = RagService()


@router.post("/session/start", response_model=LLMRoundResponse)
async def session_start(req: SessionStartRequest):
    """Reçoit le formulaire initial, retourne le Round 1 de questions."""
    try:
        result = llm_service.start_session(req.initial_form.model_dump())
        return LLMRoundResponse(done=result["done"], raw_json=result["raw_json"])
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/continue", response_model=LLMRoundResponse)
async def session_continue(req: SessionContinueRequest):
    """Continue la session avec les réponses du round précédent."""
    try:
        history = [h.model_dump() for h in req.history]
        answers = [a.model_dump() for a in req.current_answers]
        result = llm_service.continue_session(
            req.initial_form.model_dump(), history, answers
        )
        return LLMRoundResponse(done=result["done"], raw_json=result["raw_json"])
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/refine")
async def session_refine(req: SessionRefineRequest):
    """Enrichit la narrative avec des extraits RAG des textes de loi."""
    try:
        # Récupérer des extraits RAG pertinents
        rag_results = rag.query(req.incident_description, n_results=5)
        excerpts = [r.get("excerpt", r.get("content", "")) for r in rag_results]

        refined_narrative = llm_service.refine_with_rag(
            req.classification_json, excerpts
        )
        return {"narrative": refined_narrative}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**Step 2: Commit**

```bash
git add backend/app/routers/session.py
git commit -m "feat: add session router with start/continue/refine endpoints"
```

---

## Task 6: Backend — Mettre à jour main.py

**Files:**
- Modify: `backend/app/main.py`

**Step 1: Modifier main.py pour charger .env et ajouter le nouveau router**

Remplacer le contenu de `backend/app/main.py` :

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()  # Charge ANTHROPIC_API_KEY depuis .env

from app.routers import session, rag

app = FastAPI(title="BNP Incident Notification Tool V2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session.router, prefix="/api")
app.include_router(rag.router, prefix="/api")
```

**Step 2: Démarrer le backend pour vérifier**

```bash
cd backend
uvicorn app.main:app --reload
```

Expected: `Application startup complete.`
Tester: `curl http://localhost:8000/docs` → Swagger accessible

**Step 3: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: register session router, remove old classify router"
```

---

## Task 7: Frontend — Nouveaux types API (lib/api.ts)

**Files:**
- Modify: `frontend/src/lib/api.ts`

**Step 1: Remplacer le contenu de lib/api.ts**

```typescript
import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000/api" });

// === FORMULAIRE INITIAL ===

export interface InitialForm {
  detection_datetime: string;
  incident_types: string[];
  entity_name: string;
  entity_type?: string;
  personal_data_involved?: "yes" | "no" | "unknown";
  data_volume_estimate?: string;
  cross_border?: "yes" | "no" | "unknown";
  csirt_severity?: "low" | "moderate" | "serious" | "extreme";
  servicenow_ticket?: string;
  description: string;
}

// === QUESTIONS DYNAMIQUES ===

export interface DynamicQuestion {
  id: string;
  text: string;
  type: "yes_no_unknown" | "multi_select" | "text";
  options: string[] | null;
  importance: "critical" | "important" | "optional";
  if_unknown_impact: string | null;
}

export interface QuestionRoundData {
  done: false;
  round_title: string;
  questions: DynamicQuestion[];
}

export interface QuestionAnswer {
  question_id: string;
  value: string;
}

export interface RoundHistory {
  round_number: number;
  round_title: string;
  questions_json: string;
  answers: QuestionAnswer[];
}

// === CLASSIFICATION FINALE ===

export interface RegulationClassification {
  level: string;
  applicable: boolean;
  reasoning: string;
}

export interface ActionItem {
  regulation: string;
  action: string;
  deadline_hours: number | null;
  deadline_label: string;
  done: boolean;
}

export interface UnknownImpact {
  field: string;
  impact: string;
  action_required: string;
}

export interface ClassificationData {
  done: true;
  classification: {
    global_level: string;
    dora: RegulationClassification;
    rgpd: RegulationClassification;
    lopmi: RegulationClassification;
  };
  actions: ActionItem[];
  first_deadline_hours: number | null;
  unknown_impacts: UnknownImpact[];
  narrative: string;
}

// === API CALLS ===

export const sessionStart = async (
  initial_form: InitialForm
): Promise<{ done: boolean; raw_json: string }> => {
  const { data } = await api.post("/session/start", { initial_form });
  return data;
};

export const sessionContinue = async (
  initial_form: InitialForm,
  history: RoundHistory[],
  current_answers: QuestionAnswer[]
): Promise<{ done: boolean; raw_json: string }> => {
  const { data } = await api.post("/session/continue", {
    initial_form,
    history,
    current_answers,
  });
  return data;
};

export const sessionRefine = async (
  classification_json: string,
  incident_description: string
): Promise<{ narrative: string }> => {
  const { data } = await api.post("/session/refine", {
    classification_json,
    incident_description,
  });
  return data;
};

// RAG chatbot — conservé
export interface ChatSource {
  source: string;
  page: string;
  excerpt?: string;
}

export const chatWithAgent = async (
  question: string,
  incidentContext: string = ""
): Promise<{ answer: string; sources: ChatSource[] }> => {
  const { data } = await api.post("/chat", {
    question,
    incident_context: incidentContext,
  });
  return data;
};
```

**Step 2: Vérifier la compilation TypeScript**

```bash
cd frontend
npx tsc --noEmit
```

Expected: pas d'erreur

**Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: update API types for session-based LLM pipeline"
```

---

## Task 8: Frontend — Hook useSession

**Files:**
- Create: `frontend/src/hooks/useSession.ts`

**Step 1: Créer le dossier hooks et le hook**

```bash
mkdir -p frontend/src/hooks
```

**Step 2: Créer useSession.ts**

```typescript
// frontend/src/hooks/useSession.ts
import { useState } from "react";
import {
  InitialForm,
  QuestionAnswer,
  RoundHistory,
  QuestionRoundData,
  ClassificationData,
  sessionStart,
  sessionContinue,
} from "../lib/api";

type SessionState =
  | { phase: "initial" }
  | { phase: "questions"; currentRound: QuestionRoundData; roundNumber: number }
  | { phase: "result"; classification: ClassificationData };

export function useSession() {
  const [state, setState] = useState<SessionState>({ phase: "initial" });
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [initialForm, setInitialForm] = useState<InitialForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSession = async (form: InitialForm) => {
    setLoading(true);
    setError(null);
    setInitialForm(form);
    try {
      const res = await sessionStart(form);
      const parsed = JSON.parse(res.raw_json);
      if (parsed.done) {
        setState({ phase: "result", classification: parsed as ClassificationData });
      } else {
        setState({
          phase: "questions",
          currentRound: parsed as QuestionRoundData,
          roundNumber: 1,
        });
      }
    } catch (e) {
      setError("Erreur lors du démarrage de la session. Vérifiez la connexion backend.");
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
    setHistory(updatedHistory);

    try {
      const res = await sessionContinue(initialForm, updatedHistory, answers);
      const parsed = JSON.parse(res.raw_json);
      if (parsed.done) {
        setState({ phase: "result", classification: parsed as ClassificationData });
      } else {
        setState({
          phase: "questions",
          currentRound: parsed as QuestionRoundData,
          roundNumber: roundNumber + 1,
        });
      }
    } catch (e) {
      setError("Erreur lors de la soumission des réponses.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setState({ phase: "initial" });
    setHistory([]);
    setInitialForm(null);
    setError(null);
  };

  return { state, loading, error, startSession, submitAnswers, reset, initialForm };
}
```

**Step 3: Commit**

```bash
git add frontend/src/hooks/useSession.ts
git commit -m "feat: add useSession hook for LLM pipeline state management"
```

---

## Task 9: Frontend — Formulaire initial (InitialForm.tsx)

**Files:**
- Create: `frontend/src/components/session/InitialForm.tsx`

**Step 1: Créer le dossier et le composant**

```bash
mkdir -p frontend/src/components/session
```

**Step 2: Créer InitialForm.tsx**

```tsx
// frontend/src/components/session/InitialForm.tsx
import { useState } from "react";
import type { InitialForm as InitialFormData } from "../../lib/api";

interface Props {
  onSubmit: (form: InitialFormData) => void;
  loading: boolean;
}

const now = new Date();
const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 16);

export default function InitialForm({ onSubmit, loading }: Props) {
  const [detectionDatetime, setDetectionDatetime] = useState(localIso);
  const [incidentTypes, setIncidentTypes] = useState<string[]>([]);
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState("");
  const [personalData, setPersonalData] = useState<"yes" | "no" | "unknown">("unknown");
  const [dataVolume, setDataVolume] = useState("");
  const [crossBorder, setCrossBorder] = useState<"yes" | "no" | "unknown">("unknown");
  const [csirtSeverity, setCsirtSeverity] = useState("");
  const [servicenow, setServicenow] = useState("");
  const [description, setDescription] = useState("");

  const today = new Date();
  const detection = new Date(detectionDatetime);
  const diffMs = today.getTime() - detection.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  const durationLabel = diffMs > 0 ? `${diffH}h ${diffM}min depuis la détection` : "Date future";

  const toggleType = (type: string) => {
    setIncidentTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityName || incidentTypes.length === 0) return;
    onSubmit({
      detection_datetime: detectionDatetime,
      incident_types: incidentTypes,
      entity_name: entityName,
      entity_type: entityType || undefined,
      personal_data_involved: personalData,
      data_volume_estimate: dataVolume || undefined,
      cross_border: crossBorder,
      csirt_severity: csirtSeverity as any || undefined,
      servicenow_ticket: servicenow || undefined,
      description,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg border p-6 space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">Informations initiales sur l'incident</h2>

        {/* Dates */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date et heure de détection <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={detectionDatetime}
              onChange={(e) => setDetectionDatetime(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex flex-col justify-end">
            <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm">
              <div className="text-blue-600 font-medium">Aujourd'hui : {today.toLocaleDateString("fr-FR")} {today.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
              <div className="text-blue-800 font-semibold mt-1">{durationLabel}</div>
            </div>
          </div>
        </div>

        {/* Nature de l'incident */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nature de l'incident <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {[
              { value: "cyber", label: "Cyber Security Incident (cyberattaque, intrusion, ransomware…)" },
              { value: "data_breach", label: "Data Breach (violation ou exposition de données)" },
              { value: "tech_failure", label: "Technology Failure (panne, défaillance technique)" },
            ].map(({ value, label }) => (
              <label key={value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incidentTypes.includes(value)}
                  onChange={() => toggleType(value)}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Entité */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entité BNP Paribas touchée <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              placeholder="Ex: BNP Paribas SA, Cetelem, Cardif…"
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type d'entité
            </label>
            <input
              type="text"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="Ex: IT, Risk, Compliance, RH…"
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Données personnelles */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Données personnelles potentiellement affectées ? <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            {(["yes", "no", "unknown"] as const).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setPersonalData(val)}
                className={`px-4 py-2 rounded-md text-sm border font-medium transition-colors ${
                  personalData === val
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {val === "yes" ? "Oui" : val === "no" ? "Non" : "Je ne sais pas"}
              </button>
            ))}
          </div>
        </div>

        {/* Volume et transfrontalier */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Volume estimé (données / personnes affectées)
            </label>
            <input
              type="text"
              value={dataVolume}
              onChange={(e) => setDataVolume(e.target.value)}
              placeholder="Ex: ~10 000 clients, 500 enregistrements"
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Impact transfrontalier (&gt;1 pays UE) ?
            </label>
            <div className="flex gap-3">
              {(["yes", "no", "unknown"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCrossBorder(val)}
                  className={`px-3 py-1.5 rounded-md text-sm border font-medium transition-colors ${
                    crossBorder === val
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {val === "yes" ? "Oui" : val === "no" ? "Non" : "Incertain"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CSIRT et ServiceNow */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sévérité CSIRT (si déjà évaluée)
            </label>
            <select
              value={csirtSeverity}
              onChange={(e) => setCsirtSeverity(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Non évaluée</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="serious">Serious</option>
              <option value="extreme">Extreme</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de ticket ServiceNow
            </label>
            <input
              type="text"
              value={servicenow}
              onChange={(e) => setServicenow(e.target.value)}
              placeholder="INC0001234"
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Description libre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description de l'incident
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Décrivez l'incident ou collez ici une alerte, un email CSIRT ou un résumé reçu.
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Ex: Alerte CSIRT reçue le 08/03 à 14h — activité suspecte sur serveur XYZ, exfiltration potentielle de données clients vers IP externe..."
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !entityName || incidentTypes.length === 0}
        className="w-full py-3 px-6 bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Analyse en cours..." : "Analyser l'incident"}
      </button>
    </form>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/session/InitialForm.tsx
git commit -m "feat: add InitialForm component with LEG0115-based fields"
```

---

## Task 10: Frontend — QuestionRound (rounds dynamiques)

**Files:**
- Create: `frontend/src/components/session/QuestionRound.tsx`

**Step 1: Créer QuestionRound.tsx**

```tsx
// frontend/src/components/session/QuestionRound.tsx
import { useState } from "react";
import type { QuestionRoundData, QuestionAnswer, DynamicQuestion } from "../../lib/api";

interface Props {
  round: QuestionRoundData;
  roundNumber: number;
  onSubmit: (answers: QuestionAnswer[]) => void;
  loading: boolean;
}

function QuestionItem({
  question,
  value,
  onChange,
}: {
  question: DynamicQuestion;
  value: string;
  onChange: (val: string) => void;
}) {
  if (question.type === "yes_no_unknown") {
    return (
      <div>
        <div className="flex gap-3 flex-wrap">
          {["yes", "no", "unknown"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-4 py-2 rounded-md text-sm border font-medium transition-colors ${
                value === opt
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {opt === "yes" ? "Oui" : opt === "no" ? "Non" : "Je ne sais pas"}
            </button>
          ))}
        </div>
        {value === "unknown" && question.if_unknown_impact && (
          <p className="mt-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1">
            Impact : {question.if_unknown_impact}
          </p>
        )}
      </div>
    );
  }

  if (question.type === "multi_select" && question.options) {
    const selected = value ? value.split("|||") : [];
    const toggle = (opt: string) => {
      const next = selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt];
      onChange(next.join("|||"));
    };
    return (
      <div className="space-y-2">
        {question.options.map((opt) => (
          <label key={opt} className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="mt-0.5"
            />
            <span className="text-sm text-gray-700">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Votre réponse..."
    />
  );
}

export default function QuestionRound({ round, roundNumber, onSubmit, loading }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const criticalUnanswered = round.questions.filter(
    (q) => q.importance === "critical" && !answers[q.id]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result: QuestionAnswer[] = round.questions.map((q) => ({
      question_id: q.id,
      value: answers[q.id] || "unknown",
    }));
    onSubmit(result);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            Round {roundNumber}
          </span>
          <h2 className="text-lg font-semibold text-gray-900">{round.round_title}</h2>
        </div>

        <div className="space-y-6">
          {round.questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <div className="flex items-start gap-2">
                {q.importance === "critical" && (
                  <span className="text-red-500 text-xs font-semibold mt-0.5 shrink-0">CRITIQUE</span>
                )}
                <label className="text-sm font-medium text-gray-800">{q.text}</label>
              </div>
              <QuestionItem
                question={q}
                value={answers[q.id] || ""}
                onChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
              />
            </div>
          ))}
        </div>
      </div>

      {criticalUnanswered.length > 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          {criticalUnanswered.length} question(s) critique(s) sans réponse — vous pouvez choisir "Je ne sais pas".
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-6 bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
      >
        {loading ? "Analyse en cours..." : "Continuer"}
      </button>
    </form>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/session/QuestionRound.tsx
git commit -m "feat: add QuestionRound component for dynamic LLM questions"
```

---

## Task 11: Frontend — Mettre à jour ResultsDashboard

**Files:**
- Modify: `frontend/src/components/results/ResultsDashboard.tsx`

**Step 1: Lire le fichier actuel avant de modifier**

Lire `frontend/src/components/results/ResultsDashboard.tsx` en entier.

**Step 2: Remplacer le contenu de ResultsDashboard.tsx**

```tsx
// frontend/src/components/results/ResultsDashboard.tsx
import { useState } from "react";
import type { ClassificationData, InitialForm } from "../../lib/api";
import { sessionRefine } from "../../lib/api";
import Countdown from "./Countdown";
import RegulationBlock from "./RegulationBlock";

interface Props {
  result: ClassificationData;
  initialForm: InitialForm;
  onReset: () => void;
}

const LEVEL_CONFIG = {
  majeur: { label: "MAJEUR", bg: "bg-red-600", text: "text-white" },
  significatif: { label: "SIGNIFICATIF", bg: "bg-orange-500", text: "text-white" },
  mineur: { label: "MINEUR", bg: "bg-blue-600", text: "text-white" },
  non_qualifie: { label: "NON QUALIFIÉ", bg: "bg-gray-400", text: "text-white" },
  non_applicable: { label: "NON APPLICABLE", bg: "bg-gray-300", text: "text-gray-700" },
};

export default function ResultsDashboard({ result, initialForm, onReset }: Props) {
  const [narrative, setNarrative] = useState(result.narrative);
  const [refining, setRefining] = useState(false);
  const [actionsDone, setActionsDone] = useState<Record<string, boolean>>({});

  const globalConfig = LEVEL_CONFIG[result.classification.global_level as keyof typeof LEVEL_CONFIG] ?? LEVEL_CONFIG.non_qualifie;

  const handleRefine = async () => {
    setRefining(true);
    try {
      const res = await sessionRefine(
        JSON.stringify(result.classification),
        initialForm.description
      );
      setNarrative(res.narrative);
    } catch {
      // fail silently
    } finally {
      setRefining(false);
    }
  };

  const toggleAction = (key: string) => {
    setActionsDone((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Grouper les actions par réglementation
  const actionsByReg: Record<string, typeof result.actions> = {};
  result.actions.forEach((a) => {
    if (!actionsByReg[a.regulation]) actionsByReg[a.regulation] = [];
    actionsByReg[a.regulation].push(a);
  });

  return (
    <div className="space-y-6">
      {/* Bandeau gravité */}
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
              {Object.entries(result.classification)
                .filter(([k]) => ["dora", "rgpd", "lopmi"].includes(k))
                .map(([reg, val]) => (
                  typeof val === "object" && val.applicable && (
                    <span key={reg} className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium uppercase">
                      {reg}
                    </span>
                  )
                ))}
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

      {/* Données manquantes */}
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

      {/* Blocs actions par réglementation */}
      {Object.entries(actionsByReg).map(([reg, actions]) => (
        <RegulationBlock
          key={reg}
          regulation={reg}
          level={result.classification[reg.toLowerCase() as "dora" | "rgpd" | "lopmi"]?.level ?? "non_applicable"}
          reasoning={result.classification[reg.toLowerCase() as "dora" | "rgpd" | "lopmi"]?.reasoning ?? ""}
          actions={actions.map((a, i) => ({
            action: a.action,
            delay_hours: a.deadline_hours,
            delay_label: a.deadline_label,
            regulation: a.regulation,
            done: actionsDone[`${reg}-${i}`] ?? false,
          }))}
          onToggleAction={(i) => toggleAction(`${reg}-${i}`)}
          detectionDatetime={initialForm.detection_datetime}
        />
      ))}

      {/* Narrative LLM */}
      <div className="bg-white rounded-lg border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Analyse juridique</h3>
          <button
            onClick={handleRefine}
            disabled={refining}
            className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-3 py-1 disabled:opacity-50 transition-colors"
          >
            {refining ? "Enrichissement..." : "Plus de précision avec les textes de loi"}
          </button>
        </div>
        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
          {narrative}
        </div>
      </div>

      {/* Bouton reset */}
      <button
        onClick={onReset}
        className="w-full py-2.5 px-6 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
      >
        Nouvel incident
      </button>
    </div>
  );
}
```

**Note:** Le composant `RegulationBlock` existant attend des props spécifiques. Si la signature ne correspond pas, adapter l'interface `onToggleAction` selon ce que RegulationBlock expose actuellement.

**Step 3: Commit**

```bash
git add frontend/src/components/results/ResultsDashboard.tsx
git commit -m "feat: update ResultsDashboard for V2 LLM classification output"
```

---

## Task 12: Frontend — Mettre à jour App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Remplacer App.tsx**

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSession } from "./hooks/useSession";
import InitialForm from "./components/session/InitialForm";
import QuestionRound from "./components/session/QuestionRound";
import ResultsDashboard from "./components/results/ResultsDashboard";

const queryClient = new QueryClient();

function AppContent() {
  const { state, loading, error, startSession, submitAnswers, reset, initialForm } = useSession();

  return (
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
            onSubmit={(answers) => submitAnswers(answers, state.currentRound, state.roundNumber)}
            loading={loading}
          />
        )}

        {state.phase === "result" && initialForm && (
          <ResultsDashboard
            result={state.classification}
            initialForm={initialForm}
            onReset={reset}
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

**Step 2: Vérifier la compilation TypeScript**

```bash
cd frontend
npx tsc --noEmit
```

Expected: pas d'erreur

**Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: update App.tsx for V2 session-based pipeline"
```

---

## Task 13: Backend — Adapter RegulationBlock aux nouvelles props

**Files:**
- Read: `frontend/src/components/results/RegulationBlock.tsx`

**Step 1: Lire RegulationBlock.tsx pour vérifier la signature actuelle**

Lire le fichier et comparer avec ce que ResultsDashboard lui passe (Task 11).
Adapter si nécessaire (la prop `onToggleAction` peut s'appeler différemment dans V1).

**Step 2: Adapter les props si nécessaire**

Si `RegulationBlock` attend `actions` dans un format différent, adapter le mapping dans `ResultsDashboard.tsx`.

**Step 3: Test manuel complet**

1. Démarrer backend : `cd backend && uvicorn app.main:app --reload`
2. Démarrer frontend : `cd frontend && npm run dev`
3. Remplir le formulaire initial avec un incident de type ransomware avec données personnelles
4. Vérifier que Round 1 apparaît avec des questions pertinentes
5. Répondre aux questions (mix Oui/Non/Je ne sais pas)
6. Vérifier que Round 2 ou la conclusion apparaît
7. Vérifier le dashboard de résultats : bandeau gravité, actions, narrative
8. Cliquer "Plus de précision" → vérifier que la narrative se met à jour

**Step 4: Commit final**

```bash
git add -A
git commit -m "feat: complete V2 LLM pipeline — dynamic questions, classification, narrative"
```

---

## Récapitulatif des fichiers créés/modifiés

### Backend
| Fichier | Action |
|---------|--------|
| `backend/requirements.txt` | Modifier — ajouter `anthropic`, `python-dotenv` |
| `backend/.env.example` | Créer |
| `backend/app/models/session.py` | Créer |
| `backend/app/services/prompt_builder.py` | Créer |
| `backend/app/services/llm_service.py` | Créer |
| `backend/app/routers/session.py` | Créer |
| `backend/app/main.py` | Modifier |

### Frontend
| Fichier | Action |
|---------|--------|
| `frontend/src/lib/api.ts` | Modifier — nouveaux types + appels API |
| `frontend/src/hooks/useSession.ts` | Créer |
| `frontend/src/components/session/InitialForm.tsx` | Créer |
| `frontend/src/components/session/QuestionRound.tsx` | Créer |
| `frontend/src/components/results/ResultsDashboard.tsx` | Modifier |
| `frontend/src/App.tsx` | Modifier |
