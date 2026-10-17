"""
Tests for Circuit Breaker and state transitions.
"""

import pytest
from whale_audit.app.state.circuit_breaker import CircuitBreakerManager
from whale_audit.app.config import settings


@pytest.mark.asyncio
async def test_circuit_breaker_trip_and_reset(db_session):
    permitted, reason = await CircuitBreakerManager.check_execution_permitted(db_session)
    assert permitted is True
    assert reason is None

    state = await CircuitBreakerManager.trip(db_session, "Volatile spread breach", operator_id="test_op")
    assert state.is_tripped is True
    assert state.trip_reason == "Volatile spread breach"

    permitted, reason = await CircuitBreakerManager.check_execution_permitted(db_session)
    assert permitted is False
    assert "Circuit breaker tripped" in reason

    state = await CircuitBreakerManager.reset(db_session, operator_id="test_op")
    assert state.is_tripped is False
    assert state.trip_reason is None

    permitted, reason = await CircuitBreakerManager.check_execution_permitted(db_session)
    assert permitted is True


@pytest.mark.asyncio
async def test_consecutive_failure_auto_trip(db_session):
    state = await CircuitBreakerManager.get_or_create_state(db_session)
    assert state.consecutive_failures == 0

    for i in range(settings.circuit_breaker_max_consecutive_failures - 1):
        state = await CircuitBreakerManager.record_failure(db_session, f"Failure {i+1}")
        assert state.is_tripped is False

    state = await CircuitBreakerManager.record_failure(db_session, "Fatal execution rejection")
    assert state.is_tripped is True
    assert "Consecutive failures" in state.trip_reason


@pytest.mark.asyncio
async def test_daily_loss_limit_trip(db_session):
    loss_amount = settings.daily_loss_limit_sol + 2.5
    state = await CircuitBreakerManager.record_success(db_session, pnl_sol=-loss_amount)
    assert state.daily_loss_sol >= settings.daily_loss_limit_sol

    permitted, reason = await CircuitBreakerManager.check_execution_permitted(db_session)
    assert permitted is False
    assert "Daily loss limit" in reason
