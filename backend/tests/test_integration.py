import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime
from app.main import app


@pytest.mark.asyncio
async def test_full_cyber_incident_major():
    """Incident cyber majeur → DORA + RGPD + LOPMI tous activés."""
    payload = {
        "detection_datetime": datetime.now().isoformat(),
        "incident_type": "cyber",
        "personal_data_involved": True,
        "primary_criteria": ["critical_functions", "malicious_access"],
        "materiality_thresholds": ["clients", "duration", "data_loss"],
        "is_recurring": False,
        "rgpd_q1_is_personal_breach": True,
        "rgpd_q2_risk_rights": True,
        "rgpd_q3_high_risk": True,
        "rgpd_q4_exemption": False,
        "lopmi_intrusion_confirmed": True,
        "description": "Ransomware sur serveurs de production.",
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/classify", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["global_level"] == "major"
    assert data["dora"]["is_major"] is True
    assert data["rgpd"]["is_major"] is True
    assert data["lopmi"]["is_major"] is True
    assert data["first_deadline_hours"] == 4  # DORA rapport initial


@pytest.mark.asyncio
async def test_operational_incident_non_major():
    """Incident opérationnel sans données perso → seulement DORA non majeur."""
    payload = {
        "detection_datetime": datetime.now().isoformat(),
        "incident_type": "operational",
        "personal_data_involved": False,
        "primary_criteria": [],
        "materiality_thresholds": [],
        "is_recurring": False,
        "description": "Panne serveur de fichiers.",
    }
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/classify", json=payload)

    data = response.json()
    assert data["dora"]["is_major"] is False
    assert data["rgpd"]["applicable"] is False
    assert data["lopmi"]["applicable"] is False
