"""
Tests for pre-signing execution guardrails.
"""

from datetime import datetime, timezone
import pytest
from whale_audit.app.execution.guardrails import ExecutionGuardrails
from whale_audit.app.state.circuit_breaker import CircuitBreakerManager


@pytest.mark.asyncio
async def test_guardrail_passes_valid_quote(db_session):
    now_epoch = datetime.now(timezone.utc).timestamp()
    quote = {
        "priceUsd": 1.0,
        "slippageBps": 50,
        "timestamp": now_epoch - 1.0,
    }
    
    ok, reason = await ExecutionGuardrails.validate_pre_signing(
        db=db_session,
        quote=quote,
        token_address="So11111111111111111111111111111111111111112",
        amount_sol=2.0,
        expected_price=1.0,
    )
    assert ok is True
    assert "passed" in reason.lower()


@pytest.mark.asyncio
async def test_guardrail_blocks_excessive_slippage(db_session):
    now_epoch = datetime.now(timezone.utc).timestamp()
    quote = {
        "priceUsd": 1.0,
        "slippageBps": 600,
        "timestamp": now_epoch,
    }

    ok, reason = await ExecutionGuardrails.validate_pre_signing(
        db=db_session,
        quote=quote,
        token_address="So11111111111111111111111111111111111111112",
        amount_sol=1.0,
        expected_price=1.0,
    )
    assert ok is False
    assert "slippage" in reason.lower()


@pytest.mark.asyncio
async def test_guardrail_blocks_tripped_circuit_breaker(db_session):
    await CircuitBreakerManager.trip(db_session, "Emergency shutdown")

    now_epoch = datetime.now(timezone.utc).timestamp()
    quote = {"priceUsd": 1.0, "slippageBps": 30, "timestamp": now_epoch}

    ok, reason = await ExecutionGuardrails.validate_pre_signing(
        db=db_session,
        quote=quote,
        token_address="So11111111111111111111111111111111111111112",
        amount_sol=1.0,
        expected_price=1.0,
    )
    assert ok is False
    assert "circuit breaker" in reason.lower()
