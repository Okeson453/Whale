"""
Tests for all 4 dashboard API routes and operator controls.
"""

import pytest
from whale_audit.app.config import settings


@pytest.mark.asyncio
async def test_get_overview(client):
    response = await client.get("/api/overview")
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "wallets" in data
    assert "recent_signals" in data
    assert data["summary"]["active_whales_count"] >= 1


@pytest.mark.asyncio
async def test_get_risk(client):
    response = await client.get("/api/risk")
    assert response.status_code == 200
    data = response.json()
    assert "circuit_breaker" in data
    assert "limits" in data
    assert "whitelist" in data
    assert data["circuit_breaker"]["is_tripped"] is False


@pytest.mark.asyncio
async def test_get_positions(client):
    response = await client.get("/api/positions")
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "open_positions" in data
    assert "closed_positions" in data
    assert "executions" in data


@pytest.mark.asyncio
async def test_get_system(client):
    response = await client.get("/api/system")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["HEALTHY", "DEGRADED"]
    assert len(data["services"]) >= 4
    assert "audit_logs" in data


@pytest.mark.asyncio
async def test_operator_controls_authorization(client):
    r = await client.post("/api/controls/circuit-breaker/trip", json={"reason": "Drill"})
    assert r.status_code == 401

    headers = {"Authorization": f"Bearer {settings.operator_token}"}
    r = await client.post("/api/controls/circuit-breaker/trip", json={"reason": "Authorized Drill"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["circuit_breaker"]["is_tripped"] is True

    r = await client.post("/api/controls/circuit-breaker/reset", headers=headers)
    assert r.status_code == 200
    assert r.json()["circuit_breaker"]["is_tripped"] is False


@pytest.mark.asyncio
async def test_update_risk_limits(client):
    headers = {"Authorization": f"Bearer {settings.operator_token}"}
    payload = {
        "max_position_size_sol": 3.5,
        "max_total_exposure_sol": 35.0,
        "daily_loss_limit_sol": 8.0,
        "max_slippage_bps": 120,
    }
    r = await client.post("/api/controls/risk-settings", json=payload, headers=headers)
    assert r.status_code == 200
    assert r.json()["limits"]["max_position_size_sol"] == 3.5
