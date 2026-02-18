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
