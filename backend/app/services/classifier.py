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
