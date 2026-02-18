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
