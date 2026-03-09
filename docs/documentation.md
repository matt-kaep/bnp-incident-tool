# Documentation — BNP Incident Notification Tool

**Projet :** Capstone — Master Data Science
**Utilisateurs cibles :** Juristes Digital & IP, BNP Paribas
**Statut :** V1 — Production locale

---

## 1. Vue d'ensemble

### Problème résolu

Quand un incident de sécurité se produit chez BNP Paribas (attaque informatique, fuite de données, panne critique…), les juristes Digital & IP reçoivent une alerte — par ticket ou email — et doivent répondre à deux questions urgentes :

1. **Cet incident est-il qualifiable sous une réglementation ?** (DORA, RGPD, LOPMI)
2. **Quelles actions dois-je mener, et dans quel délai ?**

Sans outil dédié, cette qualification se fait de mémoire ou en consultant manuellement les textes réglementaires, avec un risque élevé d'erreur ou d'oubli — notamment sous la pression du temps (certaines deadlines commencent dès la détection).

L'outil BNP Incident Notification Tool automatise cette qualification en guidant le juriste à travers un formulaire structuré et en produisant immédiatement un plan d'action avec les délais réglementaires.

---

## 2. Architecture technique (résumé)

| Composant | Technologie |
|-----------|-------------|
| Backend (API) | Python 3.12 + FastAPI |
| Moteur de classification | Règles métier Python (déterministe) |
| RAG — Chatbot réglementaire | LangChain + ChromaDB + sentence-transformers |
| Frontend | React 18 + TypeScript + Tailwind + shadcn/ui |
| Communication | REST JSON via TanStack Query |

### Flux simplifié

```
[Wizard formulaire]
    └─→ POST /classify  →  Moteur de règles  →  Plan d'actions + deadlines
                                                       └─→ [Dashboard résultats]

[Chatbot]
    └─→ POST /chat  →  ChromaDB (PDFs DORA/RGPD indexés)  →  Extraits + réponse
```

Le moteur de classification est **purement déterministe** : aucune IA n'intervient dans la qualification réglementaire — seules des règles issues des textes officiels. L'IA (RAG) est réservée au chatbot d'assistance documentaire.

### Documents réglementaires indexés

- DORA — Règlement UE 2022/2554 (version EN + FR)
- Les textes sont découpés en chunks, vectorisés localement (pas de dépendance externe), et interrogeables via le chatbot.

---

## 3. Les trois réglementations couvertes

### 3.1 DORA — Digital Operational Resilience Act

**Qui ?** Toutes les entités financières de l'UE soumises à supervision (banques, assurances, établissements de paiement…).

**Quoi ?** Obligation de notifier à l'autorité compétente (en France : l'ACPR) les incidents liés aux systèmes d'information qui dépassent certains seuils.

**Pourquoi DORA s'applique toujours ?** BNP Paribas est une entité financière supervisée. L'analyse DORA est donc systématiquement déclenchée pour tout incident, quel que soit son type.

**Deadlines si incident majeur :**
- Rapport initial → ACPR dans les **4 heures**
- Rapport intermédiaire → ACPR dans les **72 heures**
- Rapport final → ACPR sous **1 mois**

---

### 3.2 RGPD — Règlement Général sur la Protection des Données

**Qui ?** Tout responsable de traitement manipulant des données personnelles.

**Quoi ?** Obligation de notifier l'autorité de contrôle (la CNIL pour la France) en cas de violation de données personnelles, et parfois les personnes concernées elles-mêmes.

**Pourquoi conditionnel ?** L'analyse RGPD ne s'active que si l'incident implique potentiellement des données personnelles. C'est l'utilisateur qui le déclare en étape 1.

**Deadlines si violation qualifiée :**
- Notification CNIL (et autres autorités EEA) → dans les **72 heures**
- Notification des personnes concernées → **sans délai** (uniquement si risque élevé sans exemption)

---

### 3.3 LOPMI — Loi d'Orientation et de Programmation du Ministère de l'Intérieur

**Qui ?** Toute victime d'une cyberattaque souhaitant activer sa couverture assurance cyber.

**Quoi ?** La loi LOPMI (2023) conditionne l'activation des garanties assurance cyber au dépôt préalable d'une plainte pénale. Sans plainte, l'assureur peut refuser d'indemniser.

**Pourquoi conditionnel ?** L'analyse LOPMI ne s'active que pour les incidents de type "cyberattaque / intrusion malveillante". Les pannes ou incidents opérationnels non malveillants ne sont pas concernés.

**Deadline si intrusion confirmée :**
- Dépôt de plainte → **72 heures** (modèle de plainte disponible sur le Sharepoint interne BNP)

---

## 4. Parcours utilisateur — Le Wizard

L'utilisateur remplit un formulaire en **3 à 5 étapes** selon la nature de l'incident. L'ordre et le nombre d'étapes s'adaptent dynamiquement aux réponses.

### Étape 1 — Triage initial (toujours présente)

L'utilisateur renseigne :

**a) Date et heure de détection**
Saisie obligatoire. Toutes les deadlines réglementaires sont calculées à partir de ce moment.

**b) Nature de l'incident** — 3 choix exclusifs :

| Choix | Effet |
|-------|-------|
| Cyberattaque / intrusion malveillante | Active l'étape LOPMI (étape 4) |
| Incident opérationnel non malveillant | Pas d'analyse LOPMI |
| Incident sur service de paiement | Pas d'analyse LOPMI |

**c) Données personnelles potentiellement affectées ?** — Oui / Non

| Réponse | Effet |
|---------|-------|
| Oui | Active l'étape RGPD (étape 3) |
| Non | L'analyse RGPD est sautée |

---

### Étape 2 — Critères DORA (toujours présente)

Deux grilles de critères à cocher indépendamment.

**Critères primaires** — au moins 1 doit être coché :

| Critère | Description |
|---------|-------------|
| Fonctions critiques | L'incident affecte des services ou systèmes ICT qui supportent des fonctions critiques ou importantes de BNP |
| Services financiers supervisés | L'incident affecte des services financiers soumis à autorisation, enregistrement ou supervision réglementaire |
| Accès malveillant réussi | L'incident constitue un accès réussi, malveillant et non autorisé aux systèmes d'information |

**Seuils de matérialité** — au moins 2 doivent être cochés pour qualification "majeur" :

| Seuil | Description |
|-------|-------------|
| Clients / contreparties | Impact mesurable sur des clients, contreparties financières ou transactions |
| Réputationnel | Couverture médiatique négative, plaintes, contact du régulateur |
| Durée | L'incident dure plus de 24h OU un service critique est indisponible plus de 2h |
| Géographique | L'impact touche au moins 2 États membres de l'UE |
| Economique | Les pertes estimées dépassent 100 000€ |
| Perte de données | Atteinte à l'intégrité, la disponibilité ou la confidentialité des données |

**Incident récurrent** — case à cocher optionnelle :
Applicable si l'incident s'est produit au moins 2 fois en 6 mois avec la même cause racine apparente.

---

### Étape 3 — Arbre de décision RGPD (conditionnelle)

Affichée uniquement si "données personnelles = oui" en étape 1.

L'utilisateur répond à une série de questions Oui/Non. Les questions suivantes n'apparaissent que selon les réponses précédentes (arbre conditionnel).

```
Q1 — Est-ce une violation de données personnelles au sens RGPD ?
│
├─ Non → Aucune notification requise. Documentation interne uniquement.
│
└─ Oui →
    Q2 — La violation est-elle susceptible d'engendrer un risque pour les droits et libertés ?
    │
    ├─ Non → Documentation interne uniquement. Pas de notification APD.
    │
    └─ Oui → NOTIFICATION CNIL (et autorités EEA concernées) sous 72h obligatoire
        │
        └─ Q3 — Y a-t-il un risque ÉLEVÉ pour les droits et libertés ?
            │
            ├─ Non → Arrêt. Pas de notification individuelle aux personnes.
            │
            └─ Oui →
                Q4 — Une exemption s'applique-t-elle ?
                  • Données protégées par chiffrement fort
                  • Mesures correctives prises neutralisant l'impact
                  • Notification individuelle disproportionnée (→ avis public à la place)
                │
                ├─ Oui → Pas de notification individuelle.
                └─ Non → NOTIFICATION DES PERSONNES CONCERNÉES sans délai
                         (validation position Groupe BNP requise)
```

---

### Étape 4 — LOPMI (conditionnelle)

Affichée uniquement si "cyberattaque" sélectionné en étape 1.

Une seule question :

**L'intrusion dans les systèmes est-elle avérée et confirmée ?**

| Réponse | Conséquence |
|---------|-------------|
| Oui | Dépôt de plainte obligatoire sous 72h pour activer la couverture assurance cyber |
| Non | Aucune obligation LOPMI — surveiller l'évolution de l'incident |

L'outil rappelle qu'un modèle de plainte est disponible sur le Sharepoint interne BNP.

---

### Étape 5 — Contexte libre (toujours présente)

Zone de texte libre permettant de décrire l'incident : systèmes concernés, premières constatations, actions déjà engagées. Ce contexte est transmis au chatbot RAG pour contextualiser ses réponses.

---

## 5. Logique de qualification — Règles métier

### Classification DORA

```
Incident majeur SI :
    (≥1 critère primaire coché) ET (≥2 seuils de matérialité cochés)
OU
    (accès malveillant réussi coché) ET (perte de données cochée)  ← auto-majeur
OU
    incident récurrent avec les conditions précédentes satisfaites sur 6 mois
```

Si non majeur → niveau "mineur" (aucune notification immédiate, suivi interne recommandé).

### Classification RGPD

Le niveau dépend de l'arbre de décision :

| Résultat de l'arbre | Niveau |
|---------------------|--------|
| Pas une violation RGPD | Non applicable |
| Violation sans risque pour les droits | Mineur (documentation interne) |
| Violation avec risque → notification APD | Significatif |
| Violation avec risque élevé + pas d'exemption | Majeur |

### Classification LOPMI

| Situation | Niveau |
|-----------|--------|
| Incident non-cyber | Non applicable |
| Cyber sans intrusion confirmée | Non applicable (surveiller) |
| Cyber avec intrusion confirmée | Majeur → plainte obligatoire |

### Niveau global de l'incident

L'outil calcule un niveau de gravité synthétique sur les trois réglementations :

```
global = max(dora.level, rgpd.level, lopmi.level)
où l'ordre est : majeur > significatif > mineur > non applicable
```

---

## 6. Dashboard de résultats

Dès que le formulaire est soumis, l'utilisateur voit :

### Bandeau de gravité
Affiche le niveau global en couleur (rouge = majeur, orange = significatif, bleu = mineur, gris = non qualifié), les réglementations actives, et un **compteur en temps réel** jusqu'à la première deadline.

Le compteur est calculé à partir de la date de détection saisie en étape 1. Il se met à jour toutes les minutes et affiche "DÉLAI DÉPASSÉ" si le temps est écoulé.

### Actions à mener par réglementation

Chaque réglementation applicable génère un bloc d'actions avec :
- Le libellé de l'action à mener
- Le délai réglementaire associé (ex: "4h", "72h", "Sans délai", "1 mois")
- Une case à cocher permettant de marquer l'action comme réalisée

**Actions DORA (incident majeur) :**
1. Soumettre le rapport initial à l'ACPR — **4h**
2. Soumettre le rapport intermédiaire à l'ACPR — **72h**
3. Soumettre le rapport final à l'ACPR — **1 mois**

**Actions RGPD (selon niveau) :**
- Notifier l'Autorité de Protection des Données compétente (CNIL) — **72h**
- Évaluer si d'autres autorités EEA/hors-EEA doivent être notifiées — **72h**
- Notifier les personnes concernées (validation position Groupe requise) — **Sans délai** *(majeur uniquement)*
- Documenter l'incident en interne — **Sans délai** *(mineur uniquement)*

**Actions LOPMI (intrusion confirmée) :**
- Déposer plainte auprès des autorités compétentes — **72h**

### Raisonnement affiché

Chaque bloc affiche le raisonnement qui a conduit à la qualification (ex : "L'incident satisfait ≥1 critère primaire et ≥2 seuils de matérialité"). Ceci permet au juriste de comprendre et de valider la qualification.

---

## 7. Chatbot réglementaire (RAG)

Un chatbot flottant est accessible depuis le dashboard résultats. Il permet de poser des questions libres sur les réglementations, contextualisées par la description de l'incident saisie à l'étape 5.

**Exemples de questions utiles :**
- "Quelles sont les informations à inclure dans le rapport initial DORA ?"
- "Quelle est la définition d'un risque élevé au sens RGPD ?"
- "Quel article DORA s'applique aux incidents de paiement ?"

Les réponses s'appuient sur les textes officiels indexés (DORA FR/EN) et citent leur source (document + numéro de page). Chaque extrait récupéré est affiché sous forme de carte source avec le passage exact du texte réglementaire.

---

## 8. Ce que l'outil ne fait pas (hors périmètre V1)

| Fonctionnalité | Raison du hors-scope |
|----------------|----------------------|
| Authentification / comptes utilisateurs | Prototype standalone — à intégrer si déploiement |
| Sauvegarde et historique des incidents | Pas de base de données persistante en V1 |
| Génération automatique des rapports PDF | Complexité d'intégration des formats ACPR |
| Intégration ITSM / SharePoint BNP | Dépend des APIs internes BNP, hors portée Capstone |
| Validation juridique des qualifications | L'outil aide, il ne remplace pas le juriste |

---

## 9. Points d'attention métier

**L'outil est une aide à la décision, pas une décision.** La qualification finale reste sous la responsabilité du juriste. L'outil réduit le risque d'oubli et accélère l'analyse, mais ne se substitue pas au jugement professionnel.

**Les délais commencent à la détection, pas à la qualification.** Le chronomètre démarre dès la date/heure saisie en étape 1. Si un incident est détecté à 8h et qualifié à 10h, il reste 2h pour le rapport initial DORA — pas 4h.

**LOPMI et assurance cyber.** La plainte LOPMI est une condition contractuelle d'activation de la couverture assurance, pas seulement une obligation légale. Un oubli peut avoir des conséquences financières directes.

**RGPD et notification individuelle.** La question Q4 (exemption) nécessite une validation de la position du Groupe BNP Paribas sur le sujet. L'outil signale cette dépendance sans la remplacer.

**Incident récurrent DORA.** La case "incident récurrent" permet de signaler un pattern répétitif qui, même si chaque occurrence individuelle ne serait pas qualifiée majeure, peut l'être collectivement sur une fenêtre glissante de 6 mois. C'est un cas prévu explicitement par DORA.
