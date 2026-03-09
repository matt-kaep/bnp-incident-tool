# Fiches Scénarios — Gestion des Incidents de Sécurité BNP Paribas

**Projet :** Capstone — Master Data Science
**Destinataires :** Juristes Digital & IP, BNP Paribas
**Date :** 2026-03-08
**Statut :** V1 — Document de référence

**Sources :**
- ProcedureLEG0115EN (D&IP Internal Procedure)
- DBRA Template (Personal Data Breach Risk Assessment, Dec 2019)
- EDPB Guidelines 01/2021 (18 cas pratiques, FR) et 09/2022 (EN)
- DORA — Règlement UE 2022/2554
- RGPD — Règlement UE 2016/679
- LOPMI — Loi n°2023-22 (Art. 323-1 à 323-3-1 Code pénal)
- Procédure LOPMI Decision Tree

---

## Guide de lecture

Ce document contient **9 fiches scénarios** correspondant aux types d'incidents les plus fréquents rencontrés par la D&IP Platform de BNP Paribas. Chaque fiche suit le même plan :

1. **Description** — nature de l'incident et variantes possibles
2. **Qualification interne BNP** — type d'incident, sévérité CSIRT, niveau d'escalade D&IP, fonctions à notifier
3. **Évaluation DBRA** — applicable si données personnelles impliquées (scoring, décision de notification DPA)
4. **Analyse réglementaire** — DORA, RGPD, LOPMI avec conditions et décisions
5. **Références EDPB** — cas concrets correspondants dans les guidelines européennes
6. **Timeline des premières 72 heures** — actions à mener dans l'ordre
7. **Zones d'ambiguïté** — points d'interprétation à surveiller
8. **Questions clés de triage** — informations à collecter dès les premières minutes

### Légende des niveaux de sévérité CSIRT

| Niveau | Description | Impact D&IP |
|--------|-------------|-------------|
| **Low** | Impact limité, fonctions non critiques | Gestion opérationnelle, escalade tactique optionnelle |
| **Moderate** | Impact modéré, systèmes non critiques | Escalade tactique optionnelle |
| **Serious** | Impact significatif sur fonctions importantes | D&IP notifiée, escalade tactique obligatoire |
| **Extreme** | Impact critique, risque réputationnel/réglementaire majeur | D&IP + escalade tactique + stratégique, cellule de crise |

### Légende de l'escalade D&IP

| Niveau | Responsable | Déclencheur |
|--------|-------------|-------------|
| **Opérationnel** | Membre D&IP ou Head of Zone | Tous les incidents initiaux |
| **Tactique** | Global Manager D&IP / GOC member | Serious/Extreme OU notification régulatoire probable |
| **Stratégique** | Deputy Group General Counsel | Extreme OU implications stratégiques majeures |

### LOPMI — Arbre de décision (synthèse)

```
DÉCISION 1 (Critère juridique):
L'incident est-il qualifiable d'attaque sur un STAD
au sens des Art. 323-1 à 323-3-1 du Code pénal ?
    │
    ├─ NON → Pas de plainte LOPMI
    │
    └─ OUI →
        DÉCISION 2 (Critère temporel):
        Sommes-nous dans les 72 heures suivant la prise de
        conscience de l'attaque sur le STAD ?
            │
            ├─ NON → Pas de plainte LOPMI (délai dépassé)
            │
            └─ OUI → DÉPÔT DE PLAINTE
                      (activation couverture assurance cyber)
```

---

## Fiche 1 — Ransomware sans exfiltration

### Description

Des attaquants déploient un ransomware qui chiffre des systèmes BNP. Les données sont inaccessibles pendant la durée de l'attaque. **Aucune exfiltration de données n'est confirmée.** Deux variantes :

- **Variante A** : sauvegarde disponible et opérationnelle → restauration possible rapidement (quelques heures)
- **Variante B** : pas de sauvegarde adéquate → indisponibilité prolongée, perte partielle possible

### Qualification interne BNP

| Dimension | Variante A | Variante B |
|-----------|-----------|-----------|
| Type d'incident | Cyber Security Incident + Tech Failure | Cyber + Tech Failure + Data Breach (disponibilité) |
| Sévérité CSIRT | Moderate à Serious | Serious à Extreme |
| Niveau escalade D&IP | Opérationnel → Tactique | Tactique → Stratégique |

**Fonctions à notifier :**
- CSIRT (toujours)
- Risk/ORM (impact opérationnel)
- Insurance (LOPMI applicable → activer assurance cyber)
- DPO (si données personnelles parmi données chiffrées)
- Communication (si impact client visible)
- Procurement (si systèmes prestataire touchés)

### Évaluation DBRA (si données personnelles dans les systèmes chiffrés)

| Dimension DBRA | Variante A | Variante B |
|----------------|-----------|-----------|
| Catégorie violation | Indisponibilité temporaire (0 pts) | Indisponibilité prolongée / permanente partielle (300 pts) |
| Action malveillante | OUI (+100) | OUI (+100) |
| Contrôleur spécial (banque) | OUI (+20) | OUI (+20) |
| Facteur atténuant — sauvegarde | OUI (risque disponibilité atténué) | NON |
| Données inintelligibles | NON — le chiffrement est opéré par le ransomware (attaquant), pas par BNP. Le facteur atténuant DBRA "données inintelligibles" (-900 pts) s'applique quand c'est le responsable de traitement qui chiffre ses propres données. Ce n'est pas ce cas. | NON |

**Décision DBRA Variante A :** Indisponibilité temporaire + sauvegarde → risque faible → documentation interne probable. Notifier DPA uniquement si volume important ou fonctions critiques.

**Décision DBRA Variante B :** Indisponibilité prolongée/permanente partielle + action malveillante + contrôleur spécial → risque significatif à élevé → notification DPA probable.

### Analyse réglementaire

**DORA — Conditionnel :**
- Critère primaire "accès malveillant réussi" satisfait (déployer un ransomware implique un accès non autorisé aux systèmes)
- Critère primaire "fonctions critiques/ICT" satisfait si des systèmes critiques sont chiffrés (par "fonctions critiques ou ICT", on entend les systèmes supportant des services financiers réglementés : paiements, dépôts, core banking, ou tout processus irremplaçable pour la continuité opérationnelle de BNP)
- Seuils de matérialité :
  - "Durée" : service critique indisponible > 2h OU incident total > 24h
  - "Impact économique" : pertes > 100 000 €
  - "Clients" : impact mesurable sur clients ou contreparties financières
- **Variante A** : souvent 1 critère primaire + 1 seuil → peut ne pas atteindre "majeur" si impact limité
- **Variante B** : probablement majeur (durée + impact économique + fonctions critiques)
- Incident majeur → rapport initial ACPR sous **4h**, intermédiaire sous **72h**, final sous **1 mois**

**RGPD — Conditionnel (selon présence de données personnelles chiffrées) :**
- **Variante A** : indisponibilité temporaire + sauvegarde → risque faible → documentation interne souvent suffisante
- **Variante B** : indisponibilité prolongée ou perte définitive → risque pour les droits → notification CNIL probable (72h)
- Note : pas de violation de confidentialité si aucune exfiltration confirmée

**LOPMI — OUI (si intrusion confirmée) :**
- Le déploiement du ransomware = accès non autorisé à un STAD → Art. 323-1 à 323-3-1 applicable
- **Délai : 72h** pour déposer plainte à partir de la prise de conscience
- Impliquer l'équipe assurance dès que LOPMI est envisagé

### Références EDPB

| Cas EDPB | Correspondance | Décision |
|----------|----------------|----------|
| **Cas 01** | Ransomware + sauvegarde appropriée + pas d'exfiltration | PAS de notification (données protégées par chiffrement fort conforme à l'état de la technique appliqué par le responsable de traitement + restauration rapide via sauvegarde) |
| **Cas 02** | Ransomware + SANS sauvegarde adéquate | Notification DPA OBLIGATOIRE (perte de disponibilité) |
| **Cas 03** | Ransomware + données de santé (hôpital) | Notification + Communication aux personnes concernées (risque élevé automatique pour données de santé) |

### Timeline des premières 72 heures

```
H+0  : Détection — alerter CSIRT + D&IP Platform
H+1  : Évaluation sévérité CSIRT, périmètre, sauvegarde ?
H+2  : Si serious/extreme → escalade Tactique
H+4  : Si DORA majeur → rapport initial ACPR
H+8  : Confirmer ou infirmer l'exfiltration (investigation forensique)
H+24 : Si LOPMI applicable → initier procédure de plainte (délai 72h)
H+48 : Si RGPD applicable → préparer notification CNIL (délai 72h depuis prise de connaissance)
H+72 : Rapport intermédiaire ACPR / Notification CNIL / Dépôt plainte LOPMI
```

### Zones d'ambiguïté

- **Exfiltration non exclue** : l'absence d'exfiltration confirmée ≠ absence d'exfiltration. L'investigation forensique prend du temps → la qualification RGPD doit rester ouverte à la révision.
- **Critère DORA "malicious access"** : le déploiement du ransomware satisfait ce critère même sans exfiltration. Point souvent mal interprété.
- **Sauvegarde partielle** : si certaines données sont perdues malgré la sauvegarde, la violation RGPD de disponibilité peut être plus significative que prévu.

### Questions clés de triage

1. Des systèmes supportant des fonctions critiques ou des services financiers supervisés sont-ils touchés ?
2. Quelle est l'indisponibilité estimée ? La sauvegarde est-elle disponible et testée ?
3. Y a-t-il des données personnelles parmi les données chiffrées ? Volume estimé ?
4. L'exfiltration préalable a-t-elle été exclue par l'investigation forensique ?
5. Combien d'entités BNP et de territoires sont touchés ?

---

## Fiche 2 — Ransomware avec exfiltration (double extorsion)

### Description

Attaque en deux temps : les attaquants s'introduisent dans les systèmes, **exfiltrent des données avant** de déployer le ransomware ("double extorsion"). Les données sont à la fois chiffrées et en possession des attaquants, qui menacent de les publier. Cas le plus grave de ransomware.

### Qualification interne BNP

| Dimension | Évaluation |
|-----------|-----------|
| Type d'incident | Cyber Security Incident + Data Breach (confidentialité + disponibilité) + Technology Failure |
| Sévérité CSIRT | Serious à Extreme (presque toujours Extreme) |
| Niveau escalade D&IP | Tactique → Stratégique (cellule de crise probable) |

**Fonctions à notifier :**
- CSIRT (toujours, immédiatement)
- DPO (données personnelles quasi-certaines)
- Communication (risque médiatique élevé)
- Insurance (LOPMI + cyber insurance)
- Risk/ORM
- Cabinet d'avocats cyber (validation Tactical)
- GDR (risques litigieux, validation Strategic)

### Évaluation DBRA

| Dimension DBRA | Évaluation |
|----------------|-----------|
| Catégorie violation | Données exposées à destinataires inconnus (30 pts) + Indisponibilité (0 à 300 pts) |
| Action malveillante | OUI (+100) |
| Données financières (BNP) | Probable (+100) |
| Données sensibles | Possible (+200) |
| Contrôleur spécial (banque) | OUI (+20) |
| Multi-entités | Probable (+50) |
| Facilité d'identification | Élevée (+80) |
| Facteur atténuant | Aucun (données en possession d'acteurs hostiles) |

**Décision DBRA :** Score élevé → Notification DPA certaine + notification aux personnes concernées très probable (risque élevé pour leurs droits et libertés).

### Analyse réglementaire

**DORA — MAJEUR (auto-majeur) :**
- Critère primaire "accès malveillant réussi" → OUI
- Seuil de matérialité "perte de données" (confidentialité + disponibilité) → OUI
- **Règle auto-majeur DORA** : accès malveillant réussi + perte de données = qualification directe en incident majeur, indépendamment du nombre de seuils de matérialité cochés
- Obligations : rapport initial ACPR **< 4h**, rapport intermédiaire **< 72h**, rapport final **< 1 mois**

**RGPD — MAJEUR (notification DPA + personnes concernées probable) :**
- Q1 : OUI (violation de données personnelles)
- Q2 : OUI (données en possession d'acteurs malveillants → risque pour droits et libertés)
- Notification CNIL sous **72h** — peut être faite sur informations partielles
- Q3 : risque élevé probable (données financières, sensibles, volume important)
- Q4 : exemption peu probable (données exposées à acteurs hostiles → chiffrement de BNP ne protège pas les données déjà exfiltrées)
- Notification aux personnes concernées probable (validation position Groupe BNP requise)
- Si données de clients de plusieurs pays → identifier l'autorité de contrôle chef de file (lead DPA) au sein de l'EEE

**LOPMI — OUI :**
- Intrusion avérée (double extorsion = présence dans les systèmes confirmée)
- STAD attaqué = Art. 323-1 applicable
- **Délai : 72h** à partir de la prise de conscience
- Engagement immédiat de l'équipe assurance

### Références EDPB

| Cas EDPB | Correspondance | Décision |
|----------|----------------|----------|
| **Cas 04** | Ransomware + sauvegarde compromise + exfiltration | Notification DPA OBLIGATOIRE + Communication publique aux personnes concernées |

### Timeline des premières 72 heures

```
H+0  : Détection — alerter CSIRT + D&IP Platform immédiatement
H+1  : Escalade Tactique + contact équipe assurance
H+2  : Évaluation périmètre exfiltration (forensique)
H+4  : Rapport initial ACPR (DORA — délai impératif)
H+6  : Décision plainte LOPMI (72h depuis prise de conscience)
H+12 : Identifier lead DPA si données multi-pays
H+24 : Escalade Stratégique si implications majeures
H+48 : Préparer notification CNIL avec informations partielles
H+72 : Notification CNIL / Rapport intermédiaire ACPR / Dépôt plainte LOPMI
```

### Zones d'ambiguïté

- **Exfiltration pas toujours immédiatement confirmée** : les attaquants peuvent ne menacer de publier que plus tard. Qualifier en anticipant le scénario le plus défavorable.
- **Périmètre RGPD incertain** : la liste exacte des données exfiltrées est souvent inconnue dans les premières heures. La notification CNIL peut être initiée sur informations partielles (notification en deux temps autorisée).
- **Lead DPA** : si des données de clients de plusieurs États membres EEE sont impliquées, identifier l'autorité chef de file pour éviter des notifications dupliquées ou incohérentes.

### Questions clés de triage

1. L'exfiltration est-elle confirmée ou seulement suspectée ? Investigation forensique en cours ?
2. Quelles catégories de données ont été exfiltrées (personnelles, financières, IP, MNPI) ?
3. Volume estimé ? Combien de personnes concernées ?
4. Les attaquants ont-ils déjà publié un échantillon ou émis une menace explicite ?
5. Des clients ou contreparties financières sont-ils directement impactés ?
6. L'équipe assurance a-t-elle été notifiée ?

---

## Fiche 3 — Intrusion ciblée / exfiltration silencieuse

### Description

Un attaquant s'introduit dans les systèmes BNP et **exfiltre des données sans déclencher d'alerte visible** (pas de ransomware, pas de chiffrement). La violation est découverte tardivement — parfois des semaines ou des mois après. Exemples : espionnage industriel, vol de données clients, vol de propriété intellectuelle ou de MNPI.

### Qualification interne BNP

| Dimension | Évaluation |
|-----------|-----------|
| Type d'incident | Cyber Security Incident + Data Breach (confidentialité) |
| Sévérité CSIRT | Serious à Extreme |
| Niveau escalade D&IP | Tactique (notification régulatoire quasi-certaine) → Stratégique |

**Fonctions à notifier :**
- CSIRT (toujours)
- DPO (données personnelles probables)
- Communication (risque réputationnel élevé)
- Insurance
- Cabinet d'avocats cyber (investigation forensique, validation Tactical)
- Si MNPI : équipes réglementation marchés financiers (hors périmètre D&IP mais à signaler)

### Évaluation DBRA

| Dimension DBRA | Évaluation |
|----------------|-----------|
| Catégorie violation | Données exposées à destinataires inconnus (+30) |
| Action malveillante | OUI (+100) |
| Données financières | Très probable (+100) |
| Contrôleur spécial (banque) | OUI (+20) |
| Facilité d'identification | Élevée à Moyenne (+80 à +50) |
| Facteur atténuant | Aucun identifiable dans les premières heures |

**Décision DBRA :** Score élevé → Notification DPA probable. Notification aux personnes concernées selon évaluation du risque élevé (Q3/Q4).

### Analyse réglementaire

**DORA — MAJEUR (auto-majeur) :**
- Critère primaire "accès malveillant réussi" → OUI
- Seuil "perte de données" (confidentialité) → OUI
- **Règle auto-majeur** déclenchée
- **Point critique** : le délai de 4h pour le rapport initial ACPR commence **à partir de la détection**, pas du début de l'intrusion. Si la détection est tardive, le rapport initial doit être soumis dans les 4h suivant la découverte.

**RGPD — Conditionnel (selon données exfiltrées) :**
- Si données personnelles parmi les données volées → analyse RGPD complète
- Q2 : risque pour droits et libertés quasi-certain si données financières, médicales, identifiants
- Notification CNIL sous **72h à partir du moment où BNP a connaissance de la violation**
- **Point critique** : "connaissance" ne signifie pas certitude absolue — dès qu'il existe une probabilité raisonnable que des données personnelles aient été exfiltrées, le délai de 72h commence

**LOPMI — OUI :**
- Intrusion avérée = accès non autorisé à STAD
- Le délai de 72h court à partir du moment où BNP **prend conscience** de l'attaque (pas de la fin de l'investigation)

### Références EDPB

| Cas EDPB | Correspondance | Décision |
|----------|----------------|----------|
| **Cas 05** | Exfiltration de données de candidats à l'emploi | Notification DPA + Communication probable |
| **Cas 06** | Mots de passe hashés (bcrypt) exfiltrés | Pas de notification (hash rend données inintelligibles — facteur atténuant reconnu) |

### Timeline des premières 72 heures

```
H+0  : Détection → alerter CSIRT + D&IP immédiatement
H+2  : Évaluation périmètre compromission, systèmes affectés
H+4  : Rapport initial ACPR (DORA)
H+6  : Escalade Tactique + contact assurance
H+12 : Évaluer si MNPI compromis → alerter équipes marchés financiers
H+24 : Forensique : confirmer/infirmer périmètre données personnelles
H+48 : Initier plainte LOPMI (délai 72h à partir prise de conscience)
H+72 : Notification CNIL / Rapport intermédiaire ACPR / Dépôt plainte
```

### Zones d'ambiguïté

- **Moment de "prise de conscience"** : un doute sur une possible intrusion ne suffit pas, mais une probabilité raisonnable suffit. Ce seuil est souvent difficile à établir et fait l'objet d'interprétations.
- **Étendue de l'exfiltration** : si l'intrusion a duré plusieurs semaines, les données exfiltrées peuvent être très étendues et l'évaluation du volume évolue au fil de l'investigation.
- **MNPI** : si des informations privilégiées (au sens MAR) ont pu être compromises → obligations supplémentaires hors périmètre D&IP à signaler.

### Questions clés de triage

1. Quand l'intrusion a-t-elle été détectée ? Quand a-t-elle probablement commencé ?
2. L'attaquant a-t-il encore accès aux systèmes ou a-t-il été éjecté ?
3. Quels systèmes ont été compromis ? Quelles données y étaient stockées ?
4. Des données personnelles sont-elles parmi les données potentiellement exfiltrées ?
5. Des MNPI ou informations réglementées (au sens MAR) ont-elles pu être compromises ?

---

## Fiche 4 — Credential stuffing sur portail bancaire

### Description

Des attaquants utilisent des listes de couples login/mot de passe issus de fuites précédentes (**hors BNP**) pour tenter de se connecter massivement sur des portails BNP (banque en ligne, applications clients). Certains comptes sont compromis avec succès. La distinction entre tentatives échouées et comptes effectivement compromis est déterminante.

### Qualification interne BNP

| Dimension | Évaluation |
|-----------|-----------|
| Type d'incident | Cyber Security Incident + Data Breach (confidentialité, si comptes compromis) |
| Sévérité CSIRT | Moderate à Serious selon taux de succès |
| Niveau escalade D&IP | Opérationnel → Tactique si comptes compromis confirmés |

**Fonctions à notifier :**
- CSIRT (toujours)
- DPO (si comptes compromis → données personnelles accessibles)
- Communication (si nombre de comptes significatif → risque médiatique)
- Insurance (si LOPMI envisagé)
- Risk/ORM

### Évaluation DBRA (si comptes compromis)

| Dimension DBRA | Évaluation |
|----------------|-----------|
| Catégorie violation | Données exposées à destinataires inconnus (+30) |
| Action malveillante | OUI (+100) |
| Données financières (solde, transactions visibles) | OUI (+100) |
| Contrôleur spécial (banque) | OUI (+20) |
| Facilité d'identification | Élevée (+80) — données bancaires = identification immédiate |
| Personnes vulnérables | Possible (+20) selon type de clientèle |
| Absence de MFA (lacune documentée) | Facteur aggravant implicite (EDPB Cas 07) |

**Décision DBRA :** Notification DPA obligatoire si comptes compromis avec données financières accessibles. Cas 07 EDPB est un cas de référence direct pour ce scénario : même si seuls 2 000 comptes sur 100 000 sont compromis, tous les 100 000 doivent être notifiés si leurs données étaient accessibles.

### Analyse réglementaire

**DORA — Conditionnel :**
- Critère primaire "accès malveillant réussi" : OUI si des comptes ont été effectivement compromis (authentification réussie = accès non autorisé)
- Critère primaire "services financiers supervisés" : OUI si le portail supporte des services bancaires réglementés
- Seuil "clients" : selon volume de comptes compromis
- Majeur probable si nombre de comptes significatif sur un portail de services financiers supervisés

**RGPD — Conditionnel (selon comptes effectivement compromis) :**
- Si zéro compte compromis (toutes tentatives échouées) → pas de violation de données à notifier
- Si des comptes ont été accédés :
  - Q1 : OUI (accès non autorisé à données personnelles)
  - Q2 : OUI (données financières + risque de fraude)
  - Notification CNIL sous **72h**
  - Q3 : risque élevé probable si transactions effectuées ou données sensibles accessibles
- Cas 07 EDPB : 100 000 personnes dont les données d'identification ont été exposées (même si seuls 2 000 comptes réellement compromis) → notification CNIL + communication à tous les 100 000

**LOPMI — Zone grise :**
- L'utilisation d'identifiants volés pour accéder à des comptes constitue-t-elle une "attaque sur STAD" ?
- Position probable : OUI si des accès non autorisés à des systèmes BNP sont confirmés — l'accès non autorisé à un STAD est visé par Art. 323-1, même par usurpation d'identifiants. Note : l'absence documentée de MFA (lacune identifiée dans le Cas 07 EDPB) peut aggraver la qualification interne, mais ne change pas l'obligation de plainte si l'accès illicite est avéré.
- Si accès réussis confirmés → dépôt de plainte à envisager dans les **72h**
- **Impliquer obligatoirement l'équipe assurance ET le cabinet d'avocats cyber pour valider la qualification LOPMI avant toute décision de plainte**

### Références EDPB

| Cas EDPB | Correspondance | Décision |
|----------|----------------|----------|
| **Cas 07** (référence centrale) | Banque — credential stuffing — 100 000 données exposées, 2 000 comptes compromis | Notification DPA OBLIGATOIRE + Communication à l'ensemble des 100 000 personnes (données financières = risque élevé automatique). Absence de MFA documentée comme lacune grave. |

### Timeline des premières 72 heures

```
H+0  : Détection de l'attaque → bloquer les tentatives (rate limiting)
H+1  : Évaluation : combien de comptes compromis ? Données accessibles ?
H+2  : Suspendre les comptes compromis, imposer réinitialisation MDP
H+4  : Si comptes compromis → escalade D&IP, alerter DPO
H+24 : Consolider le volume de comptes et données exposées
H+48 : Préparer notification CNIL (72h depuis prise de connaissance)
H+72 : Notification CNIL / Rapport ACPR si DORA déclenché
```

### Zones d'ambiguïté

- **Distinction tentatives vs comptes compromis** : déterminante mais peut prendre du temps. Ne pas attendre d'avoir le chiffre exact pour déclencher l'analyse.
- **Volume pour la notification CNIL** : selon Cas 07 EDPB, le périmètre de notification peut dépasser le nombre de comptes réellement compromis si les données de toutes les personnes ayant tenté de se connecter ont été exposées.
- **Imputation de la fuite** : si les mots de passe BNP étaient hachés (non stockés en clair), la compromission des identifiants hors BNP n'est pas imputable à BNP — mais l'obligation de notifier existe si des comptes BNP ont été accédés.

### Questions clés de triage

1. Des comptes ont-ils été effectivement accédés (authentification réussie) ?
2. Si oui : combien ? Quelles données étaient accessibles depuis ces comptes ?
3. Des transactions ou opérations ont-elles été effectuées depuis les comptes compromis ?
4. Le portail attaqué supporte-t-il des fonctions critiques ou des services financiers supervisés ?
5. Des mesures de blocage ont-elles été mises en place (suspension des comptes, MFA forcé) ?

---

## Fiche 5 — Exfiltration par insider malveillant

### Description

Un salarié BNP ou un prestataire avec accès **légitime** aux systèmes exfiltre intentionnellement des données : liste de clients, données financières, propriété intellectuelle. Peut être découvert immédiatement (détection DLP) ou après le départ de la personne. La particularité est que l'accès était techniquement autorisé — c'est son usage qui est frauduleux.

### Qualification interne BNP

| Dimension | Évaluation |
|-----------|-----------|
| Type d'incident | Cyber Security Incident + Data Breach (confidentialité) |
| Sévérité CSIRT | Moderate à Serious |
| Niveau escalade D&IP | Opérationnel → Tactique (notification DPA probable) |

**Fonctions à notifier :**
- CSIRT
- DPO (données personnelles exfiltrées)
- HR (si la personne est encore en poste)
- People & Property Security (PPS)
- Insurance
- Communication (si risque externe)
- Cabinet d'avocats cyber (qualification LOPMI, préservation de preuves)

### Évaluation DBRA

| Dimension DBRA | Évaluation |
|----------------|-----------|
| Catégorie violation | Données exposées à destinataires connus (prestataire identifié, +20) ou inconnus (+30) |
| Action malveillante | OUI (+100) |
| Données clients (financières) | Très probable (+100) |
| Contrôleur spécial (banque) | OUI (+20) |
| Facilité d'identification | Élevée (+80) |
| Facteur atténuant — données pseudonymisées | Possible mais rare (-850 si null) |

**Décision DBRA :** Notification DPA probable si données personnelles de clients. Notification aux personnes concernées selon évaluation du risque élevé (ex : si données financières volumineuses).

### Analyse réglementaire

**DORA — Conditionnel :**
- L'accès était légitime techniquement → critère "accès malveillant réussi" est discutable
- Cependant, si les données exfiltrées supportent des fonctions critiques et si l'impact opérationnel ou économique est significatif → seuils de matérialité potentiellement atteints
- Généralement moins systématiquement déclenché que dans les scénarios d'intrusion externe

**RGPD — Probable (si données personnelles de clients) :**
- Q1 : OUI (violation de confidentialité intentionnelle)
- Q2 : risque pour droits et libertés selon sensibilité et volume
- Si données personnelles de clients exfiltrées → notification CNIL sous **72h** très probable
- Q3 : risque élevé probable si données financières ou volume important
- Q4 : exemption peu probable (données en possession d'un acteur malveillant)
- Facteur atténuant possible : si les données étaient pseudonymisées ou si l'impact réel est limité (ex : l'auteur identifié et arrêté immédiatement)

**LOPMI — Zone grise :**
- L'insider avait un accès légitime → est-ce un accès "non autorisé" au sens de l'Art. 323-1 ?
- Position juridique : l'abus d'un accès autorisé pour exfiltrer des données à des fins non autorisées peut tomber sous l'Art. 323-1 (accès frauduleux) ou Art. 323-3 (extraction frauduleuse de données)
- **Impératif : validation juridique AVANT toute décision de plainte — consulter le cabinet d'avocats cyber (validation Tactical) ET l'équipe assurance. La plainte en cas d'insider expose BNP à des questions sur ses propres contrôles internes d'accès.**
- Si retenu : délai **72h**

### Références EDPB

| Cas EDPB | Correspondance | Décision |
|----------|----------------|----------|
| **Cas 08** | Employé copie intentionnellement des données clients | Notification DPA requise (violation confidentialité + action malveillante). Pas de communication aux personnes concernées si risque élevé non établi et données contenues. |

### Timeline des premières 72 heures

```
H+0  : Détection (DLP ou signalement) → sécuriser les preuves logs
H+1  : Évaluer si la personne est encore en poste → coordination HR + CSIRT
H+2  : NE PAS alerter la personne concernée avant coordination interne
H+4  : Escalade D&IP + DPO
H+8  : Révoquer les accès de la personne (si encore en poste)
H+24 : Évaluer périmètre données exfiltrées, estimer volume
H+48 : Préparer notification CNIL (72h depuis prise de connaissance)
H+72 : Notification CNIL si applicable
```

### Zones d'ambiguïté

- **Qualification LOPMI** : c'est la principale zone grise. Doit être instruite avec le cabinet d'avocats cyber.
- **Coordination RH/Sécurité** : si la personne est encore en poste, la révocation des accès et la mise à l'écart doivent être coordonnées pour ne pas compromettre une procédure judiciaire.
- **MNPI** : si les données exfiltrées incluent des informations privilégiées → alerter les équipes réglementation marchés financiers en parallèle.
- **Préservation de preuves** : les logs d'accès, emails, et fichiers doivent être sécurisés immédiatement pour ne pas compromettre une procédure judiciaire ultérieure.

### Questions clés de triage

1. L'auteur a-t-il été identifié ? Est-il encore en poste ?
2. Quelles données ont été exfiltrées ? Via quel vecteur (email, clé USB, cloud personnel) ?
3. Les données incluent-elles des données personnelles de clients ? Du MNPI ?
4. Y a-t-il des preuves que les données ont déjà été transmises à un tiers externe ?
5. Les preuves numériques (logs, emails) ont-elles été sécurisées ?

---

## Fiche 6 — Divulgation accidentelle / erreur humaine

### Description

Pas d'intention malveillante. Exemples : email envoyé au mauvais destinataire, fichier partagé avec des droits trop larges, document confidentiel transmis par erreur, mauvais fichier joint. Ce scénario couvre exclusivement des incidents non-cyber issus d'une erreur humaine.

### Qualification interne BNP

| Dimension | Évaluation |
|-----------|-----------|
| Type d'incident | Data Breach seul (pas Cyber, pas Tech Failure en général) |
| Sévérité CSIRT | Low à Moderate selon volume et sensibilité |
| Niveau escalade D&IP | Opérationnel → Tactique si notification DPA probable |

**Fonctions à notifier :**
- DPO (si données personnelles)
- Communication (si données clients exposées à des tiers)
- Selon cas : HR, Procurement

### Évaluation DBRA

| Dimension DBRA | Évaluation |
|----------------|-----------|
| Action malveillante | NON (atténuant implicite) |
| Catégorie violation | Exposées à destinataires connus (+20) ou inconnus (+30) |
| Contrôleur spécial (banque) | OUI (+20) |
| Facilité d'identification | Variable |
| **Facteur atténuant clé** | Destinataire de confiance + confirmation destruction sans lecture (-risque significatif) |
| **Facteur atténuant** | Données peu sensibles + volume faible |

**Exemples de décision DBRA :**

| Situation | Score estimé | Décision |
|-----------|-------------|----------|
| Email à collègue BNP, données basiques, confirmé non lu | Très faible | Documentation interne |
| Fichier avec données financières de 500 clients envoyé à tiers externe | Significatif | Notification CNIL probable |
| Données sensibles (santé, données bancaires) envoyées à inconnu externe | Élevé | Notification CNIL + personnes concernées probable |

### Analyse réglementaire

**DORA — Rarement déclenché :**
- Pas d'accès malveillant → critère primaire non satisfait dans la plupart des cas
- Sauf si la divulgation concerne des données de systèmes ICT critiques en volume significatif
- Dans la majorité des cas d'erreur humaine simple : DORA non applicable

**RGPD — Conditionnel (réglementation centrale pour ce scénario) :**
- Q1 : OUI si des données personnelles ont été transmises à un destinataire non autorisé
- Q2 : dépend de la sensibilité, du volume, et du destinataire
  - Email à collègue BNP sur donnée basique → risque faible → documentation interne
  - Fichier avec données financières de 500 clients → tiers externe → notification CNIL probable
  - Données sensibles à inconnu externe → risque élevé → notification CNIL + personnes concernées
- **Facteur atténuant majeur** : le destinataire a-t-il confirmé la destruction sans lecture ? Si oui, le risque élevé peut être neutralisé (Cas 09 EDPB)

**LOPMI — Non applicable :**
- Aucune attaque sur STAD. Erreur humaine interne → Art. 323-1 à 323-3-1 non applicable

### Références EDPB

| Cas EDPB | Correspondance | Décision |
|----------|----------------|----------|
| **Cas 09** | Email envoyé par erreur à un tiers de **confiance** (avocat, partenaire contractuel avec secret professionnel) | PAS de notification — la confiance et le cadre juridique éliminent le risque pour les droits |
| **Cas 13** | Email avec données personnelles envoyé au mauvais destinataire | Cas par cas (destinataire + sensibilité clés) |
| **Cas 14** | Courrier avec données personnelles mal adressé | Cas par cas |
| **Cas 15** | Données envoyées à la mauvaise adresse, volume faible | Généralement documentation interne si destinataire connu et données basiques |
| **Cas 16** | Erreur d'envoi de masse (newsletter, rapport) | Selon volume et sensibilité — peut déclencher notification si données financières |

### Timeline des premières 72 heures

```
H+0  : Découverte → contacter immédiatement le destinataire
H+1  : Obtenir confirmation écrite de non-lecture et destruction
H+2  : Evaluer sensibilité et volume des données exposées
H+4  : Si notification CNIL probable → alerter DPO + escalade D&IP
H+24 : Documenter les faits et les mesures prises (facteur atténuant)
H+72 : Notification CNIL si applicable (avec ou sans confirmation destinataire)
```

### Zones d'ambiguïté

- **"Email envoyé à un collègue" sous-évalué** : si ce collègue n'avait pas le besoin d'en connaître, c'est techniquement une violation de confidentialité.
- **Tiers de confiance** : la qualité du destinataire (avocat, partenaire avec secret professionnel, ou inconnu) est déterminante pour l'évaluation du risque (Cas 09 EDPB).
- **Confirmation de destruction** : la rapidité de réaction et la confirmation écrite du destinataire sont des facteurs atténuants documentables qui peuvent éviter la notification aux personnes concernées.

### Questions clés de triage

1. Quelles données ont été envoyées ou exposées ? Quelle sensibilité ? Quel volume ?
2. À qui ont été envoyées les données ? Tiers interne BNP, partenaire de confiance, inconnu externe ?
3. Le destinataire a-t-il confirmé la non-lecture et la destruction des données ?
4. Les données incluent-elles des données personnelles ? Des données financières ? Des données sensibles ?
5. L'accès non autorisé est-il toujours en cours ou la situation est-elle déjà contenue ?

---

## Fiche 7 — Vol ou perte de matériel

### Description

Laptop volé dans un espace public ou un bureau, clé USB perdue, smartphone professionnel égaré, dossiers papier dérobés. Le facteur clé est le chiffrement du matériel : un laptop chiffré (AES-256, clé sécurisée) génère une réponse radicalement différente d'un laptop non chiffré.

### Qualification interne BNP

| Dimension | Évaluation |
|-----------|-----------|
| Type d'incident | Data Breach (confidentialité potentielle) |
| Sévérité CSIRT | Low à Serious selon contenu et chiffrement |
| Niveau escalade D&IP | Opérationnel → Tactique si notification DPA probable |

**Fonctions à notifier :**
- DPO (si données personnelles potentiellement exposées)
- People & Property Security (PPS) — vol physique
- IT (désactivation à distance du matériel)
- Insurance

### Évaluation DBRA

| Dimension DBRA | Matériel chiffré | Matériel non chiffré |
|----------------|-----------------|---------------------|
| Données inintelligibles | OUI (-900) | NON |
| Facilité d'identification | Nulle (-850) | Élevée (+80) |
| Action malveillante (vol intentionnel) | Possible (+100) | Possible (+100) |
| Contrôleur spécial | OUI (+20) | OUI (+20) |

**Décision DBRA :**

| Situation | Décision |
|-----------|----------|
| Matériel chiffré (AES-256 + clé sécurisée) | PAS de notification — données inintelligibles = risque minimal |
| Matériel non chiffré + données personnelles basiques, faible volume | Évaluation → documentation interne souvent suffisante |
| Matériel non chiffré + données financières clients en volume | Notification CNIL probable |
| Matériel non chiffré + données sensibles (santé, etc.) | Notification CNIL + personnes concernées probable |
| Dossiers papier | Traitement similaire aux données non chiffrées |

### Analyse réglementaire

**DORA — Rarement déclenché :**
- Pas d'incident IT systémique
- Sauf si le matériel contenait des accès à des systèmes critiques (certificats, clés d'authentification, sessions actives)

**RGPD — Conditionnel (le chiffrement est le facteur clé) :**
- Matériel **chiffré** → confidentialité protégée → risque faible → documentation interne seulement
- Matériel **non chiffré** :
  - Données personnelles basiques en faible volume → selon évaluation
  - Données financières, données clients en volume → notification CNIL probable
  - Données sensibles → notification CNIL + personnes concernées probable
- Cas dossiers papier : traitement similaire aux données non chiffrées

**LOPMI — Zone grise :**
- Vol physique d'un matériel contenant des données : est-ce une "attaque sur STAD" ?
- Position probable :
  - Laptop **chiffré + MFA** → pas d'accès au STAD → LOPMI peu applicable
  - Laptop **non chiffré ou session ouverte** → peut donner accès aux systèmes BNP → LOPMI à instruire
  - Laptop avec accès direct aux systèmes BNP → LOPMI applicable si accès réel au STAD

### Références EDPB

| Cas EDPB | Correspondance | Décision |
|----------|----------------|----------|
| **Cas 10** | Tablette **chiffrée** + mot de passe fort volée | PAS de notification (données protégées = risque minimal) |
| **Cas 11** | Laptop **non chiffré** — 100 000 personnes, données exposées | Notification DPA OBLIGATOIRE + Communication aux personnes concernées |
| **Cas 12** | Documents **papier** (formulaires, dossiers physiques) | Cas par cas selon sensibilité et contexte |

### Timeline des premières 72 heures

```
H+0  : Signalement → désactiver le matériel à distance (wipe si possible)
H+1  : Évaluer : chiffrement actif ? Données stockées localement ?
H+2  : Déposer plainte pour vol physique (police) — indépendamment de LOPMI
H+4  : Si données personnelles exposées → alerter DPO + escalade D&IP
H+24 : Évaluer volume et sensibilité des données potentiellement accessibles
H+48 : Préparer notification CNIL si applicable
H+72 : Notification CNIL si applicable
```

### Zones d'ambiguïté

- **Chiffrement en théorie vs pratique** : le laptop peut être chiffré globalement mais contenir des fichiers exportés non chiffrés, ou une session active avec tokens d'authentification.
- **Pays du vol** : si le vol a eu lieu hors de France (autre État membre EEE) → la DPA compétente peut ne pas être la CNIL.
- **Dossiers papier** : pas de chiffrement possible → l'évaluation porte uniquement sur la sensibilité des données et l'identité du voleur (inconnu vs personne avec accès limité).

### Questions clés de triage

1. Le matériel était-il chiffré (full disk encryption) ? Par quel mécanisme ?
2. Quelles données étaient stockées localement sur le matériel ?
3. Y avait-il des sessions actives ou des tokens d'authentification donnant accès à des systèmes BNP ?
4. Le matériel a-t-il été signalé volé vs perdu (intention malveillante ou accident) ?
5. Le matériel a-t-il été désactivé à distance depuis la découverte ?

---

## Fiche 8 — Panne système critique (Technology Failure pure)

### Description

Défaillance technique majeure **sans origine malveillante** : panne lors d'une mise à jour, bug critique, surcharge système, défaillance d'infrastructure. Aucune violation de données intentionnelle. Systèmes ou services indisponibles pour les clients ou les opérations BNP. Exemple : plateforme de paiement hors ligne pendant plusieurs heures.

### Qualification interne BNP

| Dimension | Évaluation |
|-----------|-----------|
| Type d'incident | Technology Failure seul |
| Sévérité CSIRT | Moderate à Extreme selon durée et périmètre |
| Niveau escalade D&IP | Opérationnel (Moderate) → Tactique/Stratégique (Extreme) |

**Fonctions à notifier :**
- Risk/ORM (impact opérationnel)
- Communication (si impact client visible)
- Insurance (selon ampleur)
- DPO uniquement si perte de données personnelles avérée

### Évaluation DBRA

Sans objet dans la plupart des cas (pas de données personnelles violées). Si perte définitive de données personnelles (sans sauvegarde) → appliquer le DBRA pour évaluer le risque de disponibilité.

### Analyse réglementaire

**DORA — Central pour ce scénario :**
- Pas besoin d'accès malveillant → la panne seule peut déclencher DORA si :
  - **Critère primaire** : fonctions critiques ou services financiers supervisés affectés (ex : plateforme de paiement, services de dépôt, core banking)
  - **Seuils de matérialité** :
    - "Durée" : service critique indisponible > 2h OU incident total > 24h
    - "Clients" : impact mesurable sur clients ou contreparties financières
    - "Économique" : pertes estimées > 100 000 €
    - "Géographique" : impact dans ≥ 2 États membres UE
- Un incident majeur DORA sur panne pure est tout à fait possible
- **Incident récurrent** : si même cause racine, 2 occurrences en 6 mois → DORA récurrence applicable

**RGPD — Conditionnel (souvent limité) :**
- Si la panne a provoqué une indisponibilité de données personnelles traitées → violation de disponibilité possible
- Si indisponibilité temporaire et données récupérables sans perte → risque faible → documentation interne
- Si perte définitive de données personnelles (sans sauvegarde) → violation RGPD potentielle
- Dans la majorité des pannes courantes : RGPD non déclenché ou niveau mineur

**LOPMI — Non applicable :**
- Pas d'attaque cybercriminelle sur STAD. Défaillance technique non malveillante → Art. 323-1 à 323-3-1 non applicable

### Références EDPB

Pas de cas EDPB direct correspondant à une panne pure sans violation de données. Si perte définitive de données personnelles → se référer aux cas de violation de disponibilité (Cas 01/02 adaptés).

### Timeline des premières 72 heures

```
H+0  : Détection → alerter CSIRT + Risk/ORM + Communication
H+1  : Évaluer périmètre (services affectés, fonctions critiques ?)
H+2  : Préparer workarounds pour services critiques
H+4  : Si DORA déclenché → rapport initial ACPR
H+6  : Communication clients si impact visible
H+24 : Confirmer l'origine non malveillante (ou réviser si investigation conclut autrement)
H+72 : Rapport intermédiaire ACPR si applicable
```

### Zones d'ambiguïté

- **Panne vs sabotage** : la distinction entre défaillance accidentelle et sabotage (Tech Failure vs Cyber Incident) n'est pas toujours immédiate. L'investigation peut faire basculer la qualification → rester ouvert à la révision.
- **Panne récurrente** : une panne récurrente (même cause racine, 2 fois en 6 mois) → DORA récurrence applicable même si chaque occurrence individuelle n'atteint pas le seuil "majeur".
- **Impact clients difficile à quantifier** : utiliser les premières estimations puis affiner dans les rapports intermédiaire et final DORA.

### Questions clés de triage

1. Quels systèmes sont affectés ? Ces systèmes supportent-ils des fonctions critiques ou des services financiers supervisés ?
2. Depuis combien de temps ? Durée estimée de résolution ?
3. Des clients ou contreparties financières sont-ils impactés ? Combien ?
4. Y a-t-il une perte définitive de données (personnelles ou autres) ?
5. S'agit-il d'un incident récurrent avec la même cause racine ?
6. L'origine est-elle confirmée comme non malveillante ?

---

## Fiche 9 — Attaque via tiers / fournisseur (supply chain)

### Description

Un prestataire ou fournisseur qui traite des données BNP ou fournit des services ICT critiques est compromis. BNP est victime indirecte : ses données sont exposées ou ses systèmes affectés via le tiers. Variantes : compromission du SI du fournisseur, insertion de code malveillant dans une solution logicielle, accès non autorisé via les accès accordés au prestataire.

### Qualification interne BNP

| Dimension | Évaluation |
|-----------|-----------|
| Type d'incident | Cyber Security Incident + Data Breach (si données exposées) |
| Sévérité CSIRT | Serious à Extreme |
| Niveau escalade D&IP | Tactique (notification régulatoire probable) → Stratégique |

**Fonctions à notifier :**
- CSIRT
- DPO (données personnelles probables)
- Procurement (gestion contractuelle du prestataire)
- Insurance (couverture cyber, clauses contractuelles)
- Communication
- Cabinet d'avocats cyber (analyse contractuelle + LOPMI)

### Évaluation DBRA

BNP reste **responsable de traitement (controller)** même si la violation survient chez le sous-traitant (processor). Le DBRA s'applique du point de vue de BNP comme si la violation était directe.

| Dimension DBRA | Évaluation |
|----------------|-----------|
| Catégorie violation | Données exposées à destinataires inconnus (via le prestataire compromis, +30) |
| Action malveillante | OUI (+100) |
| Données financières | Probable (+100) — selon ce que traitait le prestataire |
| Contrôleur spécial | OUI (+20) |
| Multi-entités | Possible (+50) |
| Facilité d'identification | Variable selon nature des données |

**Décision DBRA :** Notification DPA quasi-certaine si des données personnelles de clients BNP étaient traitées par le prestataire.

### Analyse réglementaire

**DORA — Probable (spécificité supply chain) :**
- DORA couvre explicitement les incidents liés aux **prestataires ICT** (third-party ICT risk)
- Si le prestataire fournissait des services ICT supportant des fonctions critiques → critère primaire satisfait
- L'incident affecte BNP même si les systèmes BNP directs ne sont pas touchés — c'est le service rendu qui est compromis
- L'impact sur les données ou opérations BNP détermine les seuils de matérialité

**RGPD — OUI (BNP reste controller) :**
- Même si la violation survient chez le sous-traitant (processor), BNP doit notifier la CNIL
- Le sous-traitant doit notifier BNP "sans délai injustifié"
- **Le délai de 72h commence quand BNP est informée par le sous-traitant**, pas quand le sous-traitant découvre l'incident
- L'investigation sur le périmètre exact des données exposées est complexe car BNP dépend des informations du prestataire → notification sur informations partielles autorisée

**LOPMI — Conditionnel :**
- BNP est-elle la "victim entity" même si l'attaque visait le prestataire ?
- Si des systèmes BNP ont été directement accédés via les accès du prestataire → OUI, STAD BNP attaqué
- Si l'attaque est restée confinée au SI du prestataire sans accès direct aux systèmes BNP → LOPMI s'applique au prestataire, pas nécessairement à BNP
- **À instruire au cas par cas avec le cabinet d'avocats**

### Références EDPB

| Cas EDPB | Correspondance | Décision |
|----------|----------------|----------|
| **Cas 17** | Usurpation d'identité via compromission d'un compte prestataire | Notification DPA + Communication probable |
| **Cas 18** | Social engineering / phishing ciblant des prestataires avec accès aux systèmes | Selon données exfiltrées via le vecteur prestataire |

### Timeline des premières 72 heures

```
H+0  : Notification par le prestataire → démarrer le compteur 72h RGPD
H+1  : Révoquer immédiatement les accès du prestataire aux systèmes BNP
H+2  : Évaluer les données BNP traitées par le prestataire (contrats, DPA)
H+4  : Escalade Tactique + alerter DPO, Procurement, Insurance
H+6  : Si accès STAD BNP directs → envisager plainte LOPMI
H+24 : Obtenir du prestataire une cartographie des données exposées
H+48 : Préparer notification CNIL (informations partielles acceptées)
H+72 : Notification CNIL / Rapport intermédiaire ACPR si applicable
```

### Zones d'ambiguïté

- **Frontière données chez le prestataire vs données BNP accessibles via le prestataire** : en pratique difficile à distinguer. L'investigation doit cartographier les flux de données.
- **Délai RGPD** : commence à la notification par le prestataire à BNP, pas à la découverte par le prestataire. BNP doit donc agir rapidement dès réception de cette notification.
- **Lead DPA multi-pays** : si le prestataire est dans un autre État membre EEE → complexité des DPA compétentes.
- **Relation contractuelle** : BNP doit gérer simultanément sa réponse réglementaire ET la relation contractuelle avec le prestataire (clauses de responsabilité, assurance, pénalités).

### Questions clés de triage

1. Quelles données BNP étaient accessibles ou traitées par le prestataire compromis ?
2. Le prestataire a-t-il formellement notifié BNP de la violation ? Date et heure exactes de la notification ?
3. Des accès aux systèmes BNP directs ont-ils été réalisés via les accès du prestataire ?
4. Le prestataire traite-t-il des données personnelles de clients ou d'employés BNP ?
5. Les accès du prestataire aux systèmes BNP ont-ils été révoqués ?
6. Quelle est la situation contractuelle (clauses de breach notification, assurance, pénalités) ?

---

## Annexe 1 — Matrice de synthèse : scénarios × réglementations

**Légende :**
- **OUI** : réglementation applicable, obligation de notification probable
- **COND** : conditionnel selon les réponses aux questions de triage
- **NON** : réglementation non applicable
- **GZ** : zone grise — nécessite instruction juridique spécifique

| # | Scénario | DORA | RGPD | LOPMI | Sévérité BNP typique | Escalade D&IP |
|---|----------|------|------|-------|---------------------|---------------|
| 1 | Ransomware sans exfiltration | COND | COND | OUI | Serious → Extreme | Op → Tactique |
| 2 | Ransomware avec exfiltration | **OUI** (auto-majeur) | **OUI** | OUI | Extreme | Tactique → Stratégique |
| 3 | Intrusion ciblée / exfiltration silencieuse | **OUI** (auto-majeur) | **OUI** | OUI | Serious → Extreme | Tactique → Stratégique |
| 4 | Credential stuffing bancaire | COND | COND | GZ | Moderate → Serious | Op → Tactique |
| 5 | Exfiltration insider malveillant | COND | COND | GZ | Moderate → Serious | Op → Tactique |
| 6 | Divulgation accidentelle / erreur humaine | NON | COND | NON | Low → Moderate | Opérationnel |
| 7 | Vol ou perte de matériel | NON | COND | GZ | Low → Serious | Opérationnel |
| 8 | Panne système critique (Tech Failure) | **COND** (fort) | COND (faible) | NON | Moderate → Extreme | Op → Tactique/Strat |
| 9 | Attaque via tiers / fournisseur | COND | **OUI** | GZ | Serious → Extreme | Tactique → Stratégique |

### Observations clés de la matrice

**Scénarios DORA auto-majeur :** 2 et 3 (accès malveillant réussi + perte de données → qualification directe en incident majeur, sans comptage des seuils de matérialité).

**Scénarios RGPD systématiquement déclenchés :** 2, 3, 9 (violation de confidentialité quasi-certaine).

**LOPMI certaine :** 1, 2, 3 (intrusion dans STAD avérée et non équivoque).

**Zones grises LOPMI récurrentes :** 4, 5, 7, 9 — nécessitent instruction au cas par cas avec le cabinet d'avocats cyber.

**Scénarios non-cyber :** 6 et 8 — LOPMI ne s'applique jamais.

---

## Annexe 2 — Récapitulatif des délais réglementaires

| Réglementation | Obligation | Délai | Départ du délai |
|----------------|-----------|-------|----------------|
| DORA | Rapport initial → ACPR | **4 heures** | Détection de l'incident |
| DORA | Rapport intermédiaire → ACPR | **72 heures** | Détection de l'incident |
| DORA | Rapport final → ACPR | **1 mois** | Détection de l'incident |
| RGPD | Notification DPA (CNIL) | **72 heures** | Prise de connaissance par BNP (controller) |
| RGPD | Évaluation autres DPA EEE | **72 heures** | Prise de connaissance |
| RGPD | Notification personnes concernées | **Sans délai** | Décision de notification DPA |
| LOPMI | Dépôt de plainte | **72 heures** | Prise de conscience de l'attaque sur le STAD |

**Point critique commun :** les délais commencent à partir de la **détection / prise de connaissance**, pas de la fin de l'investigation. Les notifications peuvent et doivent être faites sur des informations partielles, complétées ultérieurement.

**Spécificité Fiche 9 (attaque via tiers/fournisseur) :** le délai de 72h RGPD commence au moment où **BNP reçoit la notification du sous-traitant**, pas au moment où le sous-traitant découvre lui-même l'incident. BNP doit donc agir immédiatement à réception de cette notification.

**Rappel RGPD spécifique scénario 9 (tiers/fournisseur) :** le délai de 72h commence quand BNP reçoit la notification du sous-traitant, pas quand le sous-traitant découvre l'incident.

---

## Annexe 3 — Scoring DBRA (Personal Data Breach Risk Assessment)

### Tableau des points

| Dimension | Valeur | Points |
|-----------|--------|--------|
| Action malveillante | OUI | +100 |
| Données basiques (identité, coordonnées) | OUI | +10 |
| Données comportementales (localisation, habitudes) | OUI | +30 |
| Données financières (transactions, IBAN, CB) | OUI | +100 |
| Données sensibles (Art. 9 RGPD : santé, origine, etc.) | OUI | +200 |
| Contrôleur spécial (BNP = banque → toujours OUI) | OUI | +20 |
| Personnes concernées vulnérables (mineurs, débiteurs, victimes) | OUI | +20 |
| Impact multi-entités BNP | OUI | +50 |
| Données inintelligibles (chiffrement fort AES-256, clé sécurisée) | OUI | -900 |
| Données inexactes | OUI | -10 |
| Données publiquement disponibles | OUI | -300 |

### Facilité d'identification des personnes

| Niveau | Critère | Points |
|--------|---------|--------|
| Nulle | Données chiffrées ou pseudonymisées, volume insuffisant | -850 |
| Faible | Identification nécessite des efforts significatifs | +20 |
| Moyenne | Identification possible avec efforts raisonnables | +50 |
| Élevée | Identification sans effort (nom + IBAN visible, par ex.) | +80 |

### Catégorie de violation

| Catégorie | Points |
|-----------|--------|
| Données exposées à destinataires connus | +20 |
| Données exposées à destinataires inconnus | +30 |
| Données altérées (récupérables) | +20 |
| Données altérées (irrécupérables) | +30 |
| Indisponibilité temporaire / récupérable rapidement | 0 |
| Indisponibilité permanente | +300 |

### Règles de décision pour la notification DPA

Notification DPA recommandée si :
- Impact = "Maximum" (score ≥ 300 pts) **OU**
- Volume > 100 000 personnes **OU**
- Impact ≠ "Négligeable" ET Volume ≠ "1 à 1 000" ET (Action malveillante = OUI OU Multi-entités = OUI)

---

## Annexe 4 — Fonctions internes BNP à notifier selon le type d'incident

| Fonction | Cyber Security Incident | Data Breach (données perso) | Technology Failure |
|----------|-----------------------|----------------------------|-------------------|
| CSIRT | Toujours (si serious/extreme) | Toujours | Selon impact |
| DPO | Si données perso impliquées | Toujours | Si perte de données perso |
| Risk / ORM | Impacts opérationnels | Selon impact | Toujours |
| Communication | Si exposition médiatique | Si clients notifiés | Si impact client visible |
| People & Property Security (PPS) | Selon cas | Si données employés | Non |
| HR | Si staff impliqué (insider) | Si données employés | Non |
| Procurement | Si prestataire impliqué | Si prestataire impliqué | Si prestataire impliqué |
| Insurance | Toujours (cyber insurance) | Selon ampleur | Selon ampleur |
| Cabinet d'avocats cyber | Si Tactical validé | Si notification DPA probable | Rarement |
| GDR (Governance, Risk & Disputes) | Si litige/arbitrage probable | Si litige probable | Rarement |
