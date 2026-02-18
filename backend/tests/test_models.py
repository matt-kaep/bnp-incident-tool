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
