# Cartographie Métier des Incidents — BNP Paribas D&IP Platform

**Date :** 2026-03-08
**Statut :** Draft de travail
**Sources :** ProcedureLEG0115EN, DBRA Template, EDPB Guidelines 01/2021 & 09/2022, DORA, RGPD, LOPMI, LOPMI Decision Tree

---

## Partie 1 — Taxonomie des incidents

### 1.1 Les trois types d'incidents (définitions BNP internes)

**Cyber Security Incident**
Un ou plusieurs événements de sécurité informatique ayant une probabilité significative de nuire aux actifs du Groupe ou de compromettre ses opérations, directement ou via un tiers (fournisseur, partenaire, client). Peut être accidentel ou intentionnel. Exemples : cybersquatting, déni de service, ingénierie sociale, intrusion technique, ransomware.

**Data Breach**
Destruction, perte, altération, divulgation non autorisée ou accès non autorisé à des données protégées, confidentielles ou personnelles du Groupe, en transit, stockées ou traitées. Peut porter sur la **confidentialité** (données divulguées), la **disponibilité** (données chiffrées/inaccessibles) ou l'**intégrité** (données corrompues). Peut résulter d'une action malveillante ou d'une erreur humaine / défaillance technique.

**Technology Failure**
Défaillance totale ou partielle — intentionnelle ou non — des systèmes ou technologies BNP ayant une probabilité significative de nuire aux actifs ou aux opérations. Exemple typique : panne lors d'une maintenance planifiée avec impact significatif clients.

### 1.2 Overlaps : un incident peut être les trois simultanément

Un même incident peut activer plusieurs catégories, ce qui est fréquent en pratique. Les overlaps les plus courants :

| Combinaison | Exemple typique |
|-------------|----------------|
| Cyber + Data Breach | Ransomware avec exfiltration préalable, intrusion ciblée |
| Cyber + Tech Failure | Ransomware bloquant des systèmes critiques sans exfiltration |
| Data Breach + Tech Failure | Panne induisant une indisponibilité prolongée de données |
| Cyber + Data Breach + Tech Failure | Ransomware avec exfiltration ET systèmes immobilisés |
| Data Breach seul | Erreur d'envoi email, vol de laptop, fuite par insider |
| Tech Failure seul | Panne système sans violation de données |

**Règle opérationnelle** : dès qu'un incident est identifié, les trois catégories doivent être examinées séparément. L'outil doit permettre de qualifier les trois dimensions indépendamment.

### 1.3 Qui notifie quoi dans la chaîne BNP

```
Incident détecté
    └─→ CSIRT (évaluation technique, sévérité Low/Moderate/Serious/Extreme)
            └─→ LEGAL D&IP Platform notifiée si :
                    • Data Breach impliquant des données personnelles (toujours)
                    • Cyber Security Incident évalué "serious" ou "extreme"
                            └─→ Niveau Opérationnel D&IP
                                    └─→ Niveau Tactique (si serious/extreme ou notification régulatoire probable)
                                            └─→ Niveau Stratégique (si impact majeur ou décision stratégique)
```

---

## Partie 2 — Qualification interne avant l'analyse réglementaire

### 2.1 Niveaux de sévérité CSIRT

| Niveau | Signification pratique | Impact sur D&IP |
|--------|----------------------|-----------------|
| **Low** | Impact limité, pas de fonctions critiques touchées | Gestion opérationnelle uniquement, escalade tactique optionnelle |
| **Moderate** | Impact modéré, systèmes non critiques ou impact contenu | Escalade tactique optionnelle |
| **Serious** | Impact significatif sur des fonctions ou données importantes | LEGAL D&IP notifiée, escalade tactique obligatoire |
| **Extreme** | Impact critique, systèmes majeurs, risque réputationnel/réglementaire élevé | LEGAL D&IP notifiée, escalade tactique + stratégique, cellule de crise |

### 2.2 Dimensions de l'évaluation DBRA (Data Breach Risk Assessment)

Le DBRA s'applique aux violations impliquant des **données personnelles**. Il produit un score qui guide la décision de notification DPA et/ou personnes concernées.

**Catégorie de violation** (nature de l'atteinte aux données) :
- Données exposées à des destinataires connus (ex : email mal adressé à un collègue)
- Données exposées à des destinataires inconnus (ex : fichier accessible sur internet)
- Données altérées sans usage illégal identifié
- Données altérées avec usage illégal possible (avec ou sans possibilité de récupération)
- Données temporairement indisponibles
- Données définitivement indisponibles

**Sensibilité des données** (du moins au plus risqué) :
- Données basiques : identité, coordonnées, parcours professionnel
- Données comportementales : localisation, préférences, habitudes
- Données financières : revenus, transactions, relevés bancaires, cartes de crédit
- Données sensibles (RGPD Art.9) : origine ethnique, opinions politiques, croyances religieuses, données génétiques/biométriques, santé, orientation sexuelle, infractions pénales

**Volume de personnes concernées** :
- 1 à 1 000
- 1 001 à 10 000
- 10 001 à 100 000
- Plus de 100 000

**Facilité d'identification des personnes** :
- Nulle (données chiffrées, pseudonymisées, volume insuffisant)
- Faible
- Moyenne
- Élevée

**Facteurs aggravants** :
- Action malveillante à l'origine de la violation
- Impact sur plusieurs entités BNP
- Responsable de traitement à caractéristiques spéciales (banque = oui par défaut)
- Personnes concernées vulnérables (mineurs, personnes en situation de dette, victimes de fraude…)

**Facteurs atténuants** :
- Données inintelligibles (chiffrement fort → confidentiality breach neutralisée)
- Données inexactes
- Données publiquement disponibles

### 2.3 Checklist d'information à capturer dès le triage (procédure BNP)

À collecter avant toute analyse réglementaire :
- Nature exacte de l'incident (Cyber / Data Breach / Tech Failure)
- Sévérité CSIRT déjà évaluée ?
- Timeline : début, découverte, en cours ou résolu ?
- Périmètre : business lines, entités, territoires, tiers impliqués ?
- Impact opérationnel : applications/services interrompus ? durée estimée ?
- Données impactées : type (personnel / client corporatif / IP BNP), classification (public / interne / confidentiel / secret / MNPI), volume
- Préjudice réel ou potentiel pour les clients / personnes concernées
- Cause racine identifiée ? Résolue ? Récurrente ?
- Fonctions déjà informées : CSIRT, RISK ORM, DPO, Communication, PPS, RH, Procurement, Assurances
- Numéro d'incident dans Service Now
- Cabinet d'avocats cyber engagé ?

---

## Partie 3 — Scénarios concrets

---

### Scénario 1 — Ransomware sans exfiltration

**Description**
Des attaquants déploient un ransomware qui chiffre des systèmes BNP. Les données sont inaccessibles pendant la durée de l'attaque. **Aucune exfiltration de données n'est confirmée.** Deux variantes : (a) sauvegarde disponible et restauration possible rapidement ; (b) pas de sauvegarde adéquate, indisponibilité prolongée.

**Qualification interne BNP**

| Dimension | Variante A (avec sauvegarde) | Variante B (sans sauvegarde) |
|-----------|------------------------------|------------------------------|
| Sévérité CSIRT | Moderate à Serious | Serious à Extreme |
| Type d'incident | Cyber + Tech Failure | Cyber + Tech Failure + Data Breach (disponibilité) |
| Nature de la violation DBRA | Indisponibilité temporaire | Indisponibilité prolongée / permanente partielle |
| Facteur aggravant | Action malveillante | Action malveillante, potentiellement multi-entités |

**Réglementations déclenchées**

**DORA :** Conditionnel.
- Si des fonctions critiques ou des services financiers supervisés sont touchés → critère primaire satisfait.
- Durée : si l'indisponibilité dépasse 2h sur un service critique ou 24h total → seuil de matérialité "durée" satisfait.
- Impact économique > 100k€ → seuil "économique".
- Accès malveillant réussi aux systèmes → critère primaire "malicious access" (même sans exfiltration, l'intrusion est réussie pour déployer le ransomware).
- **Variante A** : souvent 1 critère primaire + 1-2 seuils → peut ne pas atteindre le seuil "majeur" si impact limité.
- **Variante B** : très probablement majeur (durée + impact économique + fonctions critiques).

**RGPD :** Conditionnel selon si des données personnelles sont inaccessibles.
- Si la chiffrement constitue une violation de disponibilité de données personnelles → potentiellement notifiable.
- **Variante A** : sauvegarde restaurée rapidement → indisponibilité temporaire, risque faible → documentation interne souvent suffisante.
- **Variante B** : indisponibilité prolongée ou perte définitive → risque pour les droits → notification CNIL probable.
- Pas de violation de confidentialité si aucune exfiltration confirmée → évaluation de risque modérée.

**LOPMI :** Oui si intrusion confirmée.
- Le ransomware constitue une attaque sur STAD (Art. 323-1 à 323-3-1 Code pénal).
- L'intrusion est avérée (déploiement du ransomware = accès non autorisé).
- **Délai : 72h** pour déposer plainte → activer couverture assurance cyber.
- Attention : impliquer l'équipe assurance interne dès que LOPMI est envisagé.

**Zones d'ambiguïté et points d'interprétation**
- L'absence d'exfiltration confirmée ne signifie pas qu'il n'y en a pas eu — l'investigation forensique peut prendre du temps. La qualification doit rester ouverte.
- Le critère "accès malveillant réussi" DORA est rempli par le déploiement du ransomware, même sans exfiltration. C'est un point parfois mal interprété.
- Si la sauvegarde est partielle (certaines données perdues), la violation RGPD de disponibilité peut être plus significative que prévu.

**Questions clés à poser lors du triage**
1. Des systèmes supportant des fonctions critiques ou des services financiers supervisés sont-ils touchés ?
2. Quelle est l'indisponibilité estimée ? Sauvegarde disponible et opérationnelle ?
3. Y a-t-il des données personnelles parmi les données chiffrées ?
4. L'exfiltration préalable a-t-elle été exclue par l'investigation forensique ?
5. Combien d'entités BNP sont touchées ? Quels territoires ?

---

### Scénario 2 — Ransomware avec exfiltration

**Description**
Attaque en deux temps : les attaquants s'introduisent dans les systèmes, **exfiltrent des données avant** de déployer le ransomware (double extorsion). Les données sont à la fois chiffrées et en possession des attaquants, qui menacent de les publier. Cas le plus grave de ransomware.

**Qualification interne BNP**

| Dimension | Évaluation |
|-----------|-----------|
| Sévérité CSIRT | Serious à Extreme (presque toujours) |
| Type d'incident | Cyber + Data Breach (confidentialité + disponibilité) + Tech Failure |
| Nature violation DBRA | Données exposées à destinataires inconnus + indisponibilité |
| Facteur aggravant | Action malveillante, multi-entités probable, BNP = controller spécial (banque) |

**Réglementations déclenchées**

**DORA :** Presque toujours majeur.
- Critère primaire "malicious access" satisfait.
- Seuil "data loss" satisfait (confidentialité + disponibilité).
- → Règle auto-majeur : accès malveillant + perte de données = **qualification directe en incident majeur DORA**.
- **Obligations :** rapport initial ACPR sous 4h, rapport intermédiaire sous 72h, rapport final sous 1 mois.

**RGPD :** Très probablement notifiable, niveau majeur probable.
- Violation de confidentialité : données personnelles en possession d'acteurs malveillants inconnus.
- Q1 : oui (violation de données personnelles).
- Q2 : oui (risque pour droits et libertés — données potentiellement publiées / vendues).
- Notification CNIL sous 72h obligatoire.
- Q3 : risque élevé très probable (données financières, sensibles, volume important).
- Q4 : exemption peu probable (données exposées à acteurs hostiles → chiffrement inefficace du côté des victimes).
- → Notification des personnes concernées probable (validation position Groupe BNP requise).

**LOPMI :** Oui.
- Intrusion confirmée (double extorsion implique accès + présence dans les systèmes).
- Attaque sur STAD avérée.
- **Délai : 72h** pour déposer plainte.
- Assurance cyber : engagement immédiat de l'équipe assurance.

**Zones d'ambiguïté et points d'interprétation**
- L'exfiltration peut ne pas être immédiatement confirmée — les attaquants peuvent ne menacer de publier que plus tard. La qualification doit anticiper et se préparer au scénario le plus défavorable.
- La liste exacte des données exfiltrées est souvent inconnue dans les premières heures → difficulté à évaluer le périmètre RGPD. La notification CNIL peut être initiée sur des informations partielles (notification en deux temps autorisée).
- Si des données de clients de plusieurs pays sont impliquées → identifier l'autorité chef de file (lead DPA) au sein de l'EEE.

**Questions clés à poser lors du triage**
1. L'exfiltration est-elle confirmée ou seulement suspectée ? Forensique en cours ?
2. Quelles catégories de données ont été exfiltrées (personnelles, financières, IP, MNPI) ?
3. Volume estimé ? Combien de personnes concernées ?
4. Les attaquants ont-ils déjà publié un échantillon ou émis une menace explicite ?
5. Des clients ou contreparties financières sont-ils directement impactés ?
6. L'équipe assurance a-t-elle été notifiée ?

---

### Scénario 3 — Intrusion ciblée / exfiltration silencieuse

**Description**
Un attaquant s'introduit dans les systèmes BNP et **exfiltre des données sans déclencher d'alerte visible** (pas de ransomware, pas de chiffrement). La violation est découverte tardivement — parfois des semaines après. Exemples : espionnage, vol de données clients, vol de propriété intellectuelle.

**Qualification interne BNP**

| Dimension | Évaluation |
|-----------|-----------|
| Sévérité CSIRT | Serious à Extreme |
| Type d'incident | Cyber + Data Breach (confidentialité) |
| Nature violation DBRA | Données exposées à destinataires inconnus |
| Facteur aggravant | Action malveillante, durée potentiellement longue (persistance) |

**Réglementations déclenchées**

**DORA :** Probablement majeur.
- Critère primaire "malicious access" satisfait.
- Seuil "data loss" (confidentialité) satisfait.
- → Règle auto-majeur déclenchée.
- Point critique : le délai de 4h pour le rapport initial ACPR commence **à partir de la détection**, pas du début de l'intrusion. Si la détection est tardive, le rapport initial doit être soumis rapidement après la découverte.

**RGPD :** Conditionnel selon les données exfiltrées.
- Si des données personnelles sont parmi les données volées → analyse RGPD complète.
- Q2 : risque pour droits et libertés quasi-certain si données financières, médicales, identifiants.
- Notification CNIL sous 72h à partir du moment où BNP a **connaissance** de la violation.
- Point critique : "connaissance" ne signifie pas certitude absolue — dès qu'il existe une probabilité raisonnable que des données personnelles aient été exfiltrées, le délai de 72h commence.

**LOPMI :** Oui.
- Intrusion avérée = attaque sur STAD.
- Le délai de 72h court à partir du moment où BNP **prend conscience** de l'attaque (pas de la fin de l'investigation).

**Zones d'ambiguïté et points d'interprétation**
- La question du moment de "prise de conscience" est centrale pour les trois réglementations. Un doute sur une possible intrusion ne suffit pas, mais une probabilité raisonnable suffit — trouver ce seuil est souvent difficile.
- Si l'intrusion a duré plusieurs semaines → les données exfiltrées peuvent être très étendues. L'évaluation du volume est complexe et évolue au fil de l'investigation.
- Vol d'IP BNP ou de MNPI (informations privilégiées) → obligations supplémentaires (réglementation marchés financiers) hors périmètre outil mais à signaler.

**Questions clés à poser lors du triage**
1. Quand l'intrusion a-t-elle été détectée ? Quand a-t-elle probablement commencé ?
2. L'attaquant a-t-il encore accès aux systèmes ou a-t-il été éjecté ?
3. Quels systèmes ont été compromis ? Quelles données y étaient stockées ?
4. Des données personnelles sont-elles parmi les données potentiellement exfiltrées ?
5. Des MNPI ou informations réglementées (au sens MAR) ont-elles pu être compromises ?

---

### Scénario 4 — Credential stuffing sur portail bancaire

**Description**
Des attaquants utilisent des listes de couples login/mot de passe issus de fuites précédentes (hors BNP) pour tenter de se connecter massivement sur des portails BNP (banque en ligne, applications clients). Certains comptes sont compromis avec succès. Exemple directement issu de l'EDPB (cas 07).

**Qualification interne BNP**

| Dimension | Évaluation |
|-----------|-----------|
| Sévérité CSIRT | Moderate à Serious selon taux de succès |
| Type d'incident | Cyber + Data Breach si comptes compromis |
| Nature violation DBRA | Données exposées à destinataires inconnus (accès non autorisé) |
| Facteur aggravant | Action malveillante ; BNP = controller spécial (banque) ; données financières |

**Réglementations déclenchées**

**DORA :** Conditionnel.
- Si le portail attaqué supporte des fonctions critiques ou des services financiers supervisés → critère primaire probable.
- Si des comptes clients ont été compromis → impact clients (seuil de matérialité).
- L'accès réussi et non autorisé à des comptes = "malicious access" → critère primaire satisfait.
- Nombre de comptes compromis détermine si le seuil "clients" est atteint.

**RGPD :** Conditionnel selon comptes effectivement compromis.
- Si zéro compte compromis (tentatives toutes échouées) → pas de violation de données à notifier.
- Si des comptes ont été accédés → violation de confidentialité des données du compte (données d'identification, transactions visibles, solde).
- Q2 : risque pour droits et libertés probable (accès à données financières = risque de fraude).
- Notification CNIL sous 72h si des comptes ont été compromis.
- Q3 : risque élevé possible si des transactions ont été effectuées ou si des données sensibles étaient accessibles.

**LOPMI :** Zone grise.
- L'utilisation d'identifiants volés pour accéder à des comptes constitue-t-elle une "attaque sur STAD" au sens des Art. 323-1 à 323-3-1 ?
- Position probable : oui — l'accès non autorisé à un système de traitement automatisé est bien visé par ces articles, même par voie d'usurpation d'identifiants.
- Si des accès réussis sont confirmés → dépôt de plainte à envisager sous 72h.
- **Impliquer l'équipe assurance pour valider l'applicabilité LOPMI.**

**Zones d'ambiguïté et points d'interprétation**
- La distinction entre "tentatives échouées" (pas de violation) et "comptes compromis" (violation) est déterminante mais peut prendre du temps à établir.
- Le volume de comptes compromis évolue au fil de l'investigation forensique — ne pas attendre d'avoir le chiffre exact pour déclencher l'analyse.
- Si les mots de passe BNP étaient hachés (non stockés en clair), la compromission des identifiants hors BNP n'est pas imputable à BNP — mais cela ne change pas l'obligation de notifier si des comptes ont été accédés.

**Questions clés à poser lors du triage**
1. Des comptes ont-ils été effectivement accédés (authentification réussie) ?
2. Si oui : combien ? Quelles données étaient accessibles depuis ces comptes ?
3. Des transactions ou opérations ont-elles été effectuées depuis les comptes compromis ?
4. Le portail attaqué supporte-t-il des fonctions critiques ou des services financiers supervisés ?
5. Des mesures de blocage ont-elles été mises en place (suspension des comptes compromis) ? → facteur atténuant RGPD.

---

### Scénario 5 — Exfiltration par insider malveillant

**Description**
Un salarié BNP ou un prestataire avec accès légitime aux systèmes exfiltre intentionnellement des données : liste de clients, données financières, propriété intellectuelle. Peut être découvert immédiatement (détection DLP) ou après départ de la personne. Cas EDPB 08.

**Qualification interne BNP**

| Dimension | Évaluation |
|-----------|-----------|
| Sévérité CSIRT | Moderate à Serious |
| Type d'incident | Cyber + Data Breach (confidentialité) |
| Nature violation DBRA | Données exposées à destinataires connus (si prestataire identifié) ou inconnus |
| Facteur aggravant | Action malveillante ; potentiellement données commerciales stratégiques |

**Réglementations déclenchées**

**DORA :** Conditionnel.
- L'accès était légitime techniquement → "malicious access" au sens DORA est discutable.
- Cependant si les données exfiltrées supportent des fonctions critiques et si l'impact opérationnel ou économique est significatif → seuils de matérialité potentiellement atteints.
- Généralement moins systématiquement déclenché que dans les scénarios d'intrusion externe.

**RGPD :** Probable si des données personnelles sont impliquées.
- Violation de confidentialité intentionnelle.
- Q2 : risque pour droits et libertés selon sensibilité et volume.
- Si données personnelles de clients exfiltrées (ex: liste de clients avec coordonnées, données financières) → notification CNIL sous 72h très probable.
- La nature malveillante aggrave le niveau de risque → Q3 risque élevé probable si données financières ou données en volume.
- Facteur atténuant possible : si les données étaient pseudonymisées ou si l'impact réel est limité.

**LOPMI :** Zone grise.
- L'insider avait un accès légitime → est-ce un accès "non autorisé" au sens de l'Art. 323-1 ?
- Position juridique : l'abus d'un accès autorisé pour exfiltrer des données à des fins non autorisées peut tomber sous l'Art. 323-1 (accès frauduleux) ou 323-3 (extraction frauduleuse de données).
- À faire valider par le juriste ou le cabinet externe avant toute décision de plainte.
- Si retenu : délai 72h.

**Zones d'ambiguïté et points d'interprétation**
- La qualification LOPMI (accès légitime vs accès frauduleux) est la principale zone grise. Elle doit être instruite avec le cabinet d'avocats cyber si nécessaire.
- Si la personne est toujours en poste au moment de la découverte → coordination RH + Sécurité + D&IP impérative avant toute action visible.
- Les données exfiltrées peuvent inclure du MNPI → alerter les équipes réglementation marchés financiers en parallèle.
- La gestion de preuve (logs d'accès, emails, fichiers) doit être sécurisée immédiatement pour ne pas compromettre une procédure judiciaire.

**Questions clés à poser lors du triage**
1. L'auteur a-t-il été identifié ? Est-il encore en poste ?
2. Quelles données ont été exfiltrées ? Via quel vecteur (email, clé USB, cloud personnel) ?
3. Les données incluent-elles des données personnelles de clients ? Du MNPI ?
4. Y a-t-il des preuves que les données ont déjà été transmises à un tiers ?
5. L'équipe RH et la sécurité interne ont-elles été impliquées en parallèle ?

---

### Scénario 6 — Divulgation accidentelle / erreur humaine

**Description**
Pas d'intention malveillante. Exemples : email envoyé au mauvais destinataire, fichier partagé avec des droits trop larges, document confidentiel envoyé par erreur, mauvais fichier joint. Cas EDPB 09, 13, 14, 15, 16.

**Qualification interne BNP**

| Dimension | Évaluation |
|-----------|-----------|
| Sévérité CSIRT | Low à Moderate selon volume et sensibilité |
| Type d'incident | Data Breach seul (pas Cyber, pas Tech Failure en général) |
| Nature violation DBRA | Données exposées à destinataires connus (le plus souvent) |
| Facteur aggravant | Aucun (pas d'action malveillante) → atténue le risque |
| Facteur atténuant potentiel | Destinataire de confiance, données récupérées rapidement, données peu sensibles |

**Réglementations déclenchées**

**DORA :** Rarement déclenché.
- Pas d'accès malveillant → critère primaire non satisfait dans la plupart des cas.
- Sauf si la divulgation concerne des données de systèmes ICT critiques en volume significatif.
- Dans la majorité des cas d'erreur humaine simple : DORA non applicable.

**RGPD :** Conditionnel — c'est la réglementation centrale pour ce scénario.
- Q1 : oui si des données personnelles ont été transmises à un destinataire non autorisé.
- Q2 : dépend de la sensibilité, du volume, et du destinataire.
  - Email envoyé à un collègue BNP par erreur sur une donnée basique → risque faible → documentation interne.
  - Fichier avec données financières de 500 clients envoyé à un tiers externe → risque significatif → notification CNIL probable.
  - Données sensibles (santé, données bancaires) envoyées à un inconnu → risque élevé → notification CNIL + personnes concernées probable.
- Facteur clé : le destinataire a-t-il **confirmé la destruction sans lecture** ? Si oui, c'est un facteur atténuant significatif.

**LOPMI :** Non applicable.
- Aucune attaque sur STAD. Erreur humaine interne.

**Zones d'ambiguïté et points d'interprétation**
- Le cas le plus ambigu est l'email envoyé à un tiers externe inconnu avec des données sensibles. La qualification dépend du volume, de la sensibilité, et surtout de ce que le destinataire a fait de l'email.
- Un "email envoyé par erreur à un collègue" est souvent sous-évalué — si ce collègue n'avait pas le besoin d'en connaître, c'est techniquement une violation de confidentialité.
- La rapidité de réaction (rappel de l'email, contact du destinataire, confirmation de destruction) est un facteur atténuant documentable qui peut éviter la notification aux personnes concernées.

**Questions clés à poser lors du triage**
1. Quelles données ont été envoyées ou exposées ? Quelle sensibilité ? Quel volume ?
2. À qui ont été envoyées les données ? Tiers interne BNP, partenaire de confiance, inconnu externe ?
3. Le destinataire a-t-il confirmé la non-lecture et la destruction des données ?
4. Les données incluent-elles des données personnelles ? Des données financières ? Des données sensibles ?
5. L'accès non autorisé est-il toujours en cours ou la situation est-elle déjà contenue ?

---

### Scénario 7 — Vol ou perte de matériel

**Description**
Laptop volé dans un espace public ou un bureau, clé USB perdue, smartphone professionnel égaré, dossiers papier dérobés. Cas EDPB 10, 11, 12.

**Qualification interne BNP**

| Dimension | Évaluation |
|-----------|-----------|
| Sévérité CSIRT | Low à Serious selon contenu et chiffrement |
| Type d'incident | Data Breach (confidentialité potentielle) |
| Nature violation DBRA | Données exposées à destinataires inconnus (si non chiffrées) ou risque faible (si chiffrées) |
| Facteur atténuant majeur | Chiffrement complet du disque ou de la clé USB → risque de confidentialité neutralisé |

**Réglementations déclenchées**

**DORA :** Rarement déclenché.
- Pas d'incident IT systémique. Sauf si le matériel contenait des accès à des systèmes critiques (certificats, clés d'authentification).

**RGPD :** Conditionnel — le chiffrement est le facteur clé.
- Si matériel **chiffré** → confidentialité des données protégée → risque faible → documentation interne seulement.
- Si matériel **non chiffré** :
  - Données personnelles basiques en faible volume → risque limité → notification CNIL selon évaluation.
  - Données financières, données clients en volume → risque significatif → notification CNIL probable.
  - Données sensibles (santé, etc.) → risque élevé → notification CNIL + personnes concernées probable.
- Cas dossiers papier : traitement similaire aux données non chiffrées.

**LOPMI :** Zone grise.
- Vol physique de matériel contenant des données : est-ce une "attaque sur STAD" ?
- Position probable : le vol d'un laptop avec accès aux systèmes BNP peut constituer une atteinte à un STAD si le voleur peut accéder aux systèmes (ex: session ouverte, absence d'authentification forte).
- Si le laptop est chiffré et protégé par MFA → LOPMI peu applicable (pas d'accès au STAD).
- Si le laptop donne accès à des systèmes BNP → LOPMI à instruire.

**Zones d'ambiguïté et points d'interprétation**
- La question du chiffrement est binaire en théorie mais complexe en pratique : le laptop peut être chiffré globalement mais contenir des fichiers exportés non chiffrés, ou un cache de session active.
- La localisation du vol (pays de l'UE vs hors EEE) peut déterminer quelle DPA est compétente.
- Pour les dossiers papier, il n'y a pas de chiffrement possible → l'évaluation porte uniquement sur la sensibilité des données et l'identité du voleur (inconnu vs personne avec accès limité).

**Questions clés à poser lors du triage**
1. Le matériel était-il chiffré (full disk encryption) ? Par quel mécanisme ?
2. Quelles données étaient stockées localement sur le matériel ?
3. Y avait-il des sessions actives ou des tokens d'authentification pouvant donner accès à des systèmes BNP ?
4. Le matériel a-t-il été signalé volé vs perdu (intention malveillante ou accident) ?
5. Le matériel a-t-il été désactivé à distance depuis la découverte ?

---

### Scénario 8 — Panne système critique (Technology Failure pure)

**Description**
Défaillance technique majeure sans origine malveillante : panne lors d'une mise à jour, bug critique, surcharge système, défaillance d'infrastructure. **Aucune violation de données.** Systèmes ou services indisponibles pour les clients ou les opérations BNP. Exemple : plateforme de paiement hors ligne pendant plusieurs heures.

**Qualification interne BNP**

| Dimension | Évaluation |
|-----------|-----------|
| Sévérité CSIRT | Moderate à Extreme selon durée et périmètre |
| Type d'incident | Technology Failure seul |
| Nature violation DBRA | Sans objet (pas de données personnelles violées) |

**Réglementations déclenchées**

**DORA :** Central pour ce scénario.
- Pas besoin d'accès malveillant → la panne seule peut déclencher DORA si :
  - Fonctions critiques ou services financiers supervisés affectés (critère primaire).
  - Durée > 24h ou service critique indisponible > 2h (seuil matérialité "durée").
  - Impact clients ou contreparties financières (seuil "clients").
  - Impact économique > 100k€ (seuil "économique").
  - Impact dans ≥ 2 États membres (seuil "géographique").
- Un incident majeur DORA sur panne pure est tout à fait possible.
- Même logique que pour les incidents cyber sur la partie "qualification DORA".

**RGPD :** Conditionnel.
- Si la panne a provoqué une indisponibilité de données personnelles traitées → violation de disponibilité possible.
- Si indisponibilité temporaire et données récupérables sans perte → risque faible → documentation interne.
- Si perte définitive de données personnelles (sans sauvegarde) → violation RGPD potentielle.
- Dans la majorité des pannes courantes : RGPD non déclenché ou niveau mineur.

**LOPMI :** Non applicable.
- Pas d'attaque cybercriminelle sur STAD. Défaillance technique non malveillante.

**Zones d'ambiguïté et points d'interprétation**
- La distinction entre panne accidentelle et sabotage (Tech Failure vs Cyber Incident) n'est pas toujours immédiate → l'investigation peut faire basculer la qualification. Rester ouvert à la révision.
- Une panne récurrente (même cause racine, 2 occurrences en 6 mois) → DORA récurrence applicable.
- Les impacts sur les clients peuvent être difficiles à quantifier rapidement → utiliser les premières estimations puis affiner.

**Questions clés à poser lors du triage**
1. Quels systèmes sont affectés ? Ces systèmes supportent-ils des fonctions critiques ou des services financiers supervisés ?
2. Depuis combien de temps ? Durée estimée de résolution ?
3. Des clients ou contreparties financières sont-ils impactés ? Combien ?
4. Y a-t-il une perte définitive de données ?
5. S'agit-il d'un incident récurrent avec la même cause racine ?
6. L'origine est-elle confirmée comme non malveillante ?

---

### Scénario 9 — Attaque via tiers / fournisseur (supply chain)

**Description**
Un prestataire ou fournisseur qui traite des données BNP ou fournit des services ICT critiques est compromis. BNP est victime indirecte : ses données sont exposées ou ses systèmes affectés via le tiers. Variantes : compromission du SI du fournisseur, insertion de code malveillant dans une solution logicielle, accès non autorisé via les accès accordés au prestataire.

**Qualification interne BNP**

| Dimension | Évaluation |
|-----------|-----------|
| Sévérité CSIRT | Serious à Extreme |
| Type d'incident | Cyber + Data Breach (si données exposées) |
| Nature violation DBRA | Données exposées à destinataires inconnus (via le prestataire compromis) |
| Facteur aggravant | Action malveillante ; potentiellement multi-entités ; accès via tiers de confiance |

**Réglementations déclenchées**

**DORA :** Probable, avec une spécificité importante.
- DORA couvre explicitement les incidents liés aux prestataires ICT (third-party ICT risk).
- Si le prestataire fournissait des services ICT supportant des fonctions critiques → critère primaire satisfait.
- L'incident affecte BNP même si les systèmes BNP directs ne sont pas touchés — c'est le service rendu qui est compromis.
- L'impact sur les données ou opérations BNP détermine les seuils de matérialité.

**RGPD :** BNP reste responsable de traitement (controller).
- Même si la violation survient chez le sous-traitant (processor), BNP doit notifier la CNIL si les données personnelles de ses clients/employés sont exposées.
- Le sous-traitant doit notifier BNP "sans délai injustifié" → puis BNP dispose de 72h à partir de sa propre notification par le sous-traitant.
- Important : le délai de 72h commence quand BNP est informée, pas quand le sous-traitant découvre l'incident.
- L'investigation sur le périmètre exact des données exposées est complexe car BNP dépend des informations du prestataire.

**LOPMI :** Conditionnel.
- BNP est-elle la "victim entity" même si l'attaque visait le prestataire ?
- Si des systèmes BNP ont été directement accédés via les accès du prestataire → oui, STAD BNP attaqué.
- Si l'attaque est restée confinée au SI du prestataire sans accès direct aux systèmes BNP → LOPMI s'applique au prestataire, pas nécessairement à BNP.
- À instruire au cas par cas avec le cabinet d'avocats.

**Zones d'ambiguïté et points d'interprétation**
- La frontière entre "données BNP chez le prestataire" et "données BNP accessibles depuis le prestataire" est floue en pratique. L'investigation doit cartographier les flux de données.
- Le prestataire peut avoir des délais différents d'investigation et de communication → BNP peut se trouver en situation de devoir notifier avec des informations incomplètes.
- Si le prestataire est dans un autre pays de l'EEE → complexité des DPA compétentes.
- BNP doit gérer simultanément sa réponse réglementaire ET la relation contractuelle avec le prestataire (clauses de responsabilité, assurance).

**Questions clés à poser lors du triage**
1. Quelles données BNP étaient accessibles ou traitées par le prestataire compromis ?
2. Le prestataire a-t-il formellement notifié BNP de la violation ? Date et heure de la notification ?
3. Des accès aux systèmes BNP directs ont-ils été réalisés via les accès du prestataire ?
4. Le prestataire traite-t-il des données personnelles de clients ou d'employés BNP ?
5. Les accès du prestataire aux systèmes BNP ont-ils été révoqués ?
6. Quelle est la situation contractuelle (clauses de breach notification, assurance) ?

---

## Partie 4 — Matrice synthétique scénario × réglementation

**Légende :**
- **OUI** : réglementation applicable, obligation de notification probable
- **COND** : conditionnel — dépend des réponses aux questions de triage
- **NON** : réglementation non applicable dans ce scénario
- **GZ** : zone grise — nécessite instruction juridique

| Scénario | DORA | RGPD | LOPMI | Niveau BNP typique |
|----------|------|------|-------|-------------------|
| 1. Ransomware sans exfiltration | COND | COND | OUI | Serious → Extreme |
| 2. Ransomware avec exfiltration | **OUI** (auto-majeur) | **OUI** | OUI | Extreme |
| 3. Intrusion ciblée / exfiltration silencieuse | **OUI** (auto-majeur) | **OUI** | OUI | Serious → Extreme |
| 4. Credential stuffing bancaire | COND | COND | GZ | Moderate → Serious |
| 5. Exfiltration par insider malveillant | COND | COND | GZ | Moderate → Serious |
| 6. Divulgation accidentelle / erreur humaine | NON | COND | NON | Low → Moderate |
| 7. Vol ou perte de matériel | NON | COND | GZ | Low → Serious |
| 8. Panne système critique (Tech Failure pure) | **COND** (fort) | COND (faible) | NON | Moderate → Extreme |
| 9. Attaque via tiers / fournisseur | COND | **OUI** | GZ | Serious → Extreme |

### Lecture de la matrice

**Scénarios où DORA est systématiquement déclenché :** 2 et 3 (règle auto-majeur : accès malveillant + perte de données).

**Scénarios où RGPD est systématiquement déclenché :** 2, 3, 9 (violation de confidentialité de données personnelles quasi-certaine).

**Scénarios LOPMI certains :** 1, 2, 3 (intrusion dans STAD avérée).

**Zones grises LOPMI récurrentes :** 4 (credential stuffing), 5 (insider), 7 (vol matériel avec accès STAD), 9 (via tiers) — nécessitent instruction au cas par cas.

**Scénarios non-cyber :** 6 et 8 — LOPMI ne s'applique jamais, DORA peu probable pour le 6, central pour le 8.

---

## Annexe — Rappel des délais réglementaires

| Réglementation | Obligation | Délai | Départ du délai |
|----------------|-----------|-------|----------------|
| DORA | Rapport initial → ACPR | 4h | Détection de l'incident |
| DORA | Rapport intermédiaire → ACPR | 72h | Détection de l'incident |
| DORA | Rapport final → ACPR | 1 mois | Détection de l'incident |
| RGPD | Notification DPA (CNIL) | 72h | Prise de connaissance par le controller |
| RGPD | Évaluation autres DPA EEE | 72h | Prise de connaissance |
| RGPD | Notification personnes concernées | Sans délai | Décision de notification DPA |
| LOPMI | Dépôt de plainte | 72h | Prise de conscience de l'attaque |

**Point critique commun :** les délais commencent à partir de la **détection / prise de connaissance**, pas de la fin de l'investigation. Les notifications peuvent et doivent être faites sur des informations partielles, avec compléments ultérieurs.
