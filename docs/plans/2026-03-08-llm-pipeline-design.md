# Design — BNP Incident Tool V2 : Pipeline LLM Dynamique

**Date :** 2026-03-08
**Statut :** Approuvé
**Approche retenue :** Full LLM pipeline (Claude Haiku)

---

## 1. Problème résolu

Le wizard V1 est statique : 5 étapes fixes, indépendamment de l'incident. Les juristes doivent répondre à des questions non pertinentes pour leur cas. La logique déterministe ne capture pas les nuances ni les données manquantes.

La V2 remplace le wizard par un pipeline LLM adaptatif : le juriste remplit un formulaire initial minimal, puis Claude Haiku génère des rounds de questions ciblés basés sur le contexte réel de l'incident. Le LLM décide quand il a assez d'information pour qualifier.

---

## 2. Architecture globale

```
[Page 1 — Formulaire initial]
  Champs structurés (date, entité, volume, international…)
  + Zone texte libre (description / copier-coller emails/alertes)
        │
        ▼ POST /session/start
[Backend — Claude Haiku API]
  System prompt (règles DORA/RGPD/LOPMI/DBRA/LEG0115)
  + contexte initial utilisateur
  → JSON { done: false, questions: [...] }
        │
        ▼ render
[Page 2 — Questions dynamiques]
  Round N : formulaire généré (checkboxes / oui-non-je-ne-sais-pas / texte)
  → Soumission → POST /session/continue (historique complet + réponses)
  → Haiku décide : nouveau round OU done: true
        │
        ▼ quand done: true
[Page 3 — Dashboard résultats]
  Bandeau gravité + réglementations actives
  Countdown deadline
  Actions à mener avec cases à cocher
  Encart "Données manquantes" (si applicable)
  Narrative LLM (4-5 paragraphes)
  [Bouton "Plus de précision"] → POST /session/refine (RAG DORA/RGPD/LOPMI)
```

**Ce qui disparaît :** wizard 5 étapes statique, `classifier.py` déterministe, `/classify` endpoint.
**Ce qui est conservé :** RAG ChromaDB (pour `/refine`), `Countdown.tsx`, `RegulationBlock.tsx`.

---

## 3. Formulaire initial (Page 1)

Basé sur LEG0115 Appendix 2 + besoins métier identifiés.

| Champ | Type | Obligatoire |
|-------|------|-------------|
| Date et heure de détection | datetime-picker | Oui |
| Date aujourd'hui + durée depuis détection | affichage calculé automatique | — |
| Nature de l'incident | Checkbox multi : Cyber Security Incident / Data Breach / Technology Failure | Oui |
| Entité(s) BNP Paribas touchée(s) | Texte libre | Oui |
| Type d'entité | Texte libre (ex: IT, Risk, Compliance, RH…) | Non |
| Données personnelles affectées ? | Oui / Non / Je ne sais pas | Oui |
| Volume estimé données/personnes | Texte libre | Non |
| Impact transfrontalier (> 1 pays UE) ? | Oui / Non / Je ne sais pas | Non |
| Sévérité CSIRT déjà évaluée ? | Oui → Low/Moderate/Serious/Extreme / Non | Non |
| Numéro de ticket ServiceNow | Texte libre | Non |
| Description libre | Textarea (pas de limite) | Non |

Tout est sérialisé en JSON et envoyé dans le message user du premier appel LLM.

---

## 4. Pipeline LLM — Rounds de questions (Page 2)

### Format JSON de sortie LLM (round en cours)

```json
{
  "done": false,
  "round_title": "Qualification de la violation de données",
  "questions": [
    {
      "id": "q1",
      "text": "Les données exposées incluent-elles des données bancaires (IBAN, cartes) ?",
      "type": "yes_no_unknown",
      "options": null,
      "importance": "critical",
      "if_unknown_impact": "Sans cette information, le scoring DBRA est approximatif — vérifier auprès du DPO"
    },
    {
      "id": "q2",
      "text": "Quels critères DORA primaires sont vérifiés ?",
      "type": "multi_select",
      "options": [
        "Fonctions critiques affectées",
        "Services financiers supervisés affectés",
        "Accès malveillant réussi"
      ],
      "importance": "critical",
      "if_unknown_impact": null
    }
  ]
}
```

### Types de questions

| Type | Rendu frontend |
|------|---------------|
| `yes_no_unknown` | 3 boutons : Oui / Non / Je ne sais pas |
| `multi_select` | Checkboxes |
| `text` | Input texte court |

### Logique de convergence

Le LLM décide de passer à `done: true` quand :
- Il peut qualifier les 3 réglementations (DORA, RGPD, LOPMI) avec suffisamment de certitude, ou
- Les réponses "Je ne sais pas" sur des points critiques bloquent toute qualification supplémentaire

Le system prompt guide Haiku à converger en 2-3 rounds maximum (instruction explicite).

### Appels backend

- **Round 1 :** `POST /session/start` avec le formulaire initial
- **Rounds suivants :** `POST /session/continue` avec `{ history: [...rounds précédents avec réponses], current_answers: {...} }`
- **Stateless :** tout l'historique est maintenu côté frontend, renvoyé intégralement à chaque appel

---

## 5. Dashboard résultats (Page 3)

### Format JSON de sortie LLM quand `done: true`

```json
{
  "done": true,
  "classification": {
    "global_level": "majeur",
    "dora": {
      "level": "majeur",
      "reasoning": "L'incident satisfait ≥1 critère primaire et ≥2 seuils de matérialité..."
    },
    "rgpd": {
      "level": "significatif",
      "reasoning": "Violation confirmée avec risque pour droits et libertés → notification CNIL..."
    },
    "lopmi": {
      "level": "non_applicable",
      "reasoning": "Nature de l'incident non cyber ou intrusion non confirmée"
    }
  },
  "actions": [
    {
      "regulation": "DORA",
      "action": "Soumettre le rapport initial à l'ACPR",
      "deadline_hours": 4,
      "done": false
    },
    {
      "regulation": "RGPD",
      "action": "Notifier la CNIL",
      "deadline_hours": 72,
      "done": false
    }
  ],
  "unknown_impacts": [
    {
      "field": "Volume exact de personnes affectées",
      "impact": "Le scoring DBRA est approximatif. Contacter le DPO pour affiner avant notification CNIL."
    }
  ],
  "narrative": "L'incident décrit présente les caractéristiques d'une violation de données personnelles au sens de l'article 33 RGPD... [4-5 paragraphes]"
}
```

### Éléments affichés

- **Bandeau gravité** coloré (rouge = majeur, orange = significatif, bleu = mineur, gris = non qualifié)
- **Countdown** vers la première deadline (composant `Countdown.tsx` existant réutilisé)
- **Blocs actions** par réglementation avec cases à cocher (composant `RegulationBlock.tsx` existant réutilisé)
- **Encart orange "Données manquantes"** si `unknown_impacts` non vide — liste les informations critiques à obtenir
- **Explication narrative** LLM en prose (4-5 paragraphes)
- **Bouton "Plus de précision avec les textes de loi"**

### Bouton "Plus de précision"

`POST /session/refine` : envoie la classification + narrative actuelles + extraits RAG récupérés depuis ChromaDB (DORA/RGPD/LOPMI). Haiku régénère la narrative en citant les articles précis. Remplace la narrative à la volée (pas de rechargement de page).

---

## 6. Backend API

### Nouveaux endpoints

| Endpoint | Méthode | Corps | Réponse |
|----------|---------|-------|---------|
| `POST /session/start` | POST | `{ initial_form: {...} }` | JSON questions Round 1 |
| `POST /session/continue` | POST | `{ history: [...], current_answers: {...} }` | JSON Round suivant ou classification finale |
| `POST /session/refine` | POST | `{ classification: {...}, narrative: "..." }` | Narrative enrichie avec citations RAG |

### Structure backend

```
backend/app/
  routers/
    session.py          # Nouveau — remplace classify.py
    rag.py              # Conservé, utilisé par /refine
  services/
    llm_service.py      # Nouveau — appels Anthropic SDK (Haiku)
    prompt_builder.py   # Nouveau — construction du system prompt
    rag_service.py      # Conservé
  models/
    session.py          # Nouveau — Pydantic models pour les requêtes/réponses
    incident.py         # À garder ou adapter
```

**Dépendance à ajouter :**
```
anthropic>=0.40.0
```

**Variables d'environnement :**
```
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-haiku-4-5-20251001
```

---

## 7. System prompt — Structure

Estimé à ~4 000-5 000 tokens. Dans le budget Haiku (200k context window).

### Bloc 1 — Rôle (~200 tokens)
Assistant juridique expert en droit réglementaire bancaire BNP Paribas, spécialisé DORA/RGPD/LOPMI. Mission : qualifier les incidents de sécurité via rounds de questions structurés en JSON.

### Bloc 2 — Règles de qualification (~2 500 tokens)
- **DORA :** critères primaires (fonctions critiques, services supervisés, accès malveillant), seuils de matérialité (clients, réputation, durée, géographique, économique, perte données), règle auto-majeur, deadlines ACPR (4h / 72h / 1 mois)
- **RGPD :** arbre Q1→Q4 (violation ? → risque ? → risque élevé ? → exemption ?), conditions notification CNIL (72h) et personnes (sans délai), exemptions Article 34(3)
- **LOPMI :** 2 conditions cumulatives (STAD Art. 323-1 à 323-3-1 + 72h depuis connaissance), lien assurance cyber, modèle de plainte Sharepoint interne
- **DBRA :** table de scoring (action malveillante +100, données financières +100, données sensibles +200, banque +20, données inintelligibles -900, facilité identification Null -850 à High +80)

### Bloc 3 — Catégories LEG0115 (~1 000 tokens)
Liste des domaines à explorer selon contexte : nature exacte de l'incident, entités/fonctions/territoires, impact opérationnel, données affectées (type/classification/volume), cause racine, fonctions déjà notifiées (CSIRT/DPO/RH/assurance), notifications réglementaires déjà faites, assurance cyber, plainte police. Instruction : explorer seulement ce qui est pertinent au contexte.

### Bloc 4 — Format de sortie strict (~500 tokens)
Schéma JSON complet avec exemples. Instruction de convergence explicite : converger en 2-3 rounds maximum, passer à `done: true` quand qualification possible ou bloquée.

### Bloc 5 — Gestion "Je ne sais pas" (~300 tokens)
Pour chaque réponse inconnue sur un point critique : inclure dans `unknown_impacts` l'impact concret sur la qualification et l'action concrète pour obtenir l'information (qui contacter, où chercher).

---

## 8. Ce qui change vs V1

| Composant | V1 | V2 |
|-----------|----|----|
| Formulaire initial | Étape 1 wizard (4 champs) | Page dédiée (10 champs + texte libre) |
| Questions dynamiques | Étapes 2-4 statiques | Rounds LLM adaptatifs |
| Classification | `classifier.py` déterministe | Claude Haiku |
| Explication | Raisonnement template | Narrative LLM en prose |
| Données manquantes | Non géré | Signalé avec impact et action |
| "Plus de précision" | Chatbot flottant (RAG) | Bouton régénération narrative avec RAG |

---

## 9. Ce qui est hors scope V2

- Authentification / comptes utilisateurs
- Sauvegarde et historique des incidents
- Streaming de la réponse LLM (nice-to-have, pas critique)
- Génération PDF du rapport final
