# Design — Outil de Notification d'Incidents BNP Paribas

**Date :** 2026-02-18
**Projet :** Capstone — Master DS
**Utilisateurs cibles :** Juristes Digital & IP BNP Paribas
**Statut :** Approuvé

---

## Contexte

Les juristes Digital & IP de BNP Paribas reçoivent des tickets ou emails signalant des incidents de sécurité. Ils n'ont actuellement aucun outil dédié pour les aider à qualifier ces incidents et déterminer leurs obligations de notification réglementaire. Cette application V1 vise à les guider de la qualification jusqu'aux actions à mener.

**Trois réglementations couvertes :**
- **DORA** (Digital Operational Resilience Act) — notification ACPR pour incidents IT majeurs
- **RGPD** — notification CNIL + personnes concernées pour violations de données personnelles
- **LOPMI** — dépôt de plainte police sous 72h pour activer la couverture assurance cyber

---

## Architecture

### Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Python FastAPI + Pydantic |
| Moteur RAG | LangChain + ChromaDB + sentence-transformers (local) |
| Frontend | React 18 + TypeScript + shadcn/ui + Tailwind |
| HTTP client | TanStack Query |

### Structure monorepo

```
bnp-incident-tool/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   ├── classification.py     # Endpoint POST /classify
│   │   │   └── rag.py                # Endpoint POST /chat
│   │   ├── services/
│   │   │   ├── classifier.py         # Moteur de règles DORA/RGPD/LOPMI
│   │   │   └── rag_service.py        # LangChain + ChromaDB
│   │   └── models/
│   │       └── incident.py           # Pydantic schemas
│   ├── data/docs/                    # PDFs réglementaires indexés
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── wizard/               # Formulaire multi-étapes
│   │   │   ├── results/              # Dashboard actions + deadlines
│   │   │   └── chatbot/              # Interface RAG
│   │   └── App.tsx
│   └── package.json
└── docs/plans/
```

---

## Fonctionnalités V1

### 1. Wizard formulaire (5 étapes)

**Étape 1 — Triage initial** *(toujours affichée)*
- Date/heure de détection de l'incident
- Nature de l'incident :
  - Cyberattaque / intrusion malveillante ← déclenche LOPMI
  - Incident opérationnel non malveillant
  - Incident sur service de paiement
- Des données personnelles sont-elles potentiellement affectées ? ← déclenche RGPD

**Étape 2 — Critères DORA** *(toujours affichée)*

Critère primaire (au moins 1) :
- Affecte des services/systèmes ICT supportant des fonctions critiques ou importantes
- Affecte des services financiers soumis à autorisation, enregistrement ou supervision
- Constitue un accès réussi + malveillant + non autorisé aux systèmes

Seuils de matérialité (≥ 2 requis pour qualification "majeur") :
- Impact sur clients, contreparties financières, transactions
- Impact réputationnel
- Durée et indisponibilité de service (>24h ou downtime >2h sur service critique)
- Étendue géographique (≥ 2 États membres UE)
- Impact économique (pertes > 100 000€)
- Perte de données

Incident récurrent : s'est produit 2x en 6 mois avec même cause racine

**Règle de classification DORA :**
- Majeur si : (≥1 critère primaire) ET (≥2 seuils de matérialité)
- Majeur automatiquement si : accès malveillant réussi + risque de perte de données
- Majeur si récurrent : collectivement 1 primaire + 2 secondaires sur 6 mois

**Étape 3 — Arbre de décision RGPD** *(si données personnelles = oui)*

- Q1 : Violation de données personnelles au sens RGPD ?
  - Non → aucune notification
  - Oui → Q2
- Q2 : Risque pour droits et libertés des personnes ?
  - Non → documentation interne uniquement
  - Oui → Notifier APD (ex: CNIL) sous 72h + évaluer autres autorités EEA → Q3
- Q3 : Risque ÉLEVÉ ?
  - Non → stop (pas de notification individuelle)
  - Oui → Q4
- Q4 : Exemption applicable ?
  - Données protégées par chiffrement fort
  - Mesures prises pour neutraliser l'impact
  - Notification disproportionnée (avis public requis à la place)
  - Oui → pas de notification individuelle
  - Non → Notifier les personnes concernées sans délai (position Groupe BNP requise)

**Étape 4 — LOPMI** *(si cyberattaque = oui)*
- L'intrusion est-elle avérée/confirmée ?
  - Oui → dépôt de plainte obligatoire sous 72h (modèle Sharepoint interne)

**Étape 5 — Contexte libre**
- Description libre de l'incident (textarea)
- Informations supplémentaires

---

### 2. Dashboard résultats

**Zone 1 — Bandeau gravité global**
- Niveau : Majeur / Significatif / Non majeur
- Réglementations applicables : DORA / RGPD / LOPMI
- Compteur : "Première deadline dans X h"

**Zone 2 — Actions à mener** (triées par urgence, cases à cocher)

Par bloc réglementaire applicable :
- DORA Majeur : Rapport initial ACPR (4h), Rapport intermédiaire (72h), Rapport final (1 mois)
- RGPD : Notifier CNIL (72h), Notifier personnes concernées (sans délai si haut risque)
- LOPMI : Déposer plainte (72h)

**Zone 3 — Justification RAG + Chatbot**
- Justification automatique de la classification avec extraits des textes réglementaires
- Interface chatbot pour questions libres sur l'incident (RAG sur PDFs DORA/RGPD/LOPMI)

---

### 3. Module RAG

- Documents indexés : DORA (EN + FR), RGPD, guidelines EDPB
- Embeddings locaux avec sentence-transformers (pas de dépendance API externe)
- Stockage vectoriel : ChromaDB local
- Modèle LLM : configurable (OpenAI / Anthropic / local)
- Réponses avec citation des sources (article + document)

---

## Périmètre V1 — Hors scope

- Authentification / gestion des utilisateurs (standalone)
- Sauvegarde et historique des incidents
- Génération automatique des rapports (PDF)
- Intégration avec systèmes BNP existants (ITSM, SharePoint)

---

## Flux de données

```
Wizard (frontend)
    └─→ POST /classify (payload JSON)
            └─→ classifier.py (règles DORA + RGPD + LOPMI)
                    └─→ Résultats : gravité + actions + deadlines
                            └─→ Dashboard (frontend)

Chatbot (frontend)
    └─→ POST /chat (question + contexte incident)
            └─→ rag_service.py (ChromaDB + LLM)
                    └─→ Réponse avec sources
```
