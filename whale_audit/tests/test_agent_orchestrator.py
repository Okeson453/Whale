"""
Tests for Agent Orchestrator pipeline.
"""

import pytest
from whale_audit.app.services.trading.agent_orchestrator import AgentOrchestrator
from whale_audit.app.state.circuit_breaker import CircuitBreakerManager


@pytest.mark.asyncio
async def test_agent_orchestrator_pipeline_success(db_session):
    signal = {
        "id": "sig_orch_1",
        "token_address": "So11111111111111111111111111111111111111112",
        "token_symbol": "SOL",
        "amount_sol": 2.0,
        "price_usd": 150.0,
    }

    ok, reason = await AgentOrchestrator.process_signal(db_session, signal)
    assert ok is True
    assert "successfully" in reason


@pytest.mark.asyncio
async def test_agent_orchestrator_blocked_by_circuit_breaker(db_session):
    await CircuitBreakerManager.trip(db_session, "Safety trip in orchestrator test")

    signal = {
        "id": "sig_orch_2",
        "token_address": "So11111111111111111111111111111111111111112",
        "amount_sol": 1.0,
    }

    ok, reason = await AgentOrchestrator.process_signal(db_session, signal)
    assert ok is False
    assert "Circuit breaker tripped" in reason
