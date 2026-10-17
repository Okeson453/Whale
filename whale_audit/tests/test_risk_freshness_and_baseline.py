"""
Tests for evidence-based quote and valuation freshness verifications.
"""

from datetime import datetime, timezone, timedelta
import pytest
from whale_audit.app.execution.freshness import FreshnessVerifier


def test_quote_freshness_valid():
    now_epoch = datetime.now(timezone.utc).timestamp()
    quote = {
        "priceUsd": 1.05,
        "timestamp": now_epoch - 2.0,
        "slippageBps": 50,
    }
    is_fresh, age, reason = FreshnessVerifier.verify_quote_freshness(quote, max_age_seconds=15)
    assert is_fresh is True
    assert 0.0 <= age <= 5.0
    assert "fresh" in reason.lower()


def test_quote_freshness_expired():
    now_epoch = datetime.now(timezone.utc).timestamp()
    quote = {
        "priceUsd": 1.05,
        "timestamp": now_epoch - 45.0,
        "slippageBps": 50,
    }
    is_fresh, age, reason = FreshnessVerifier.verify_quote_freshness(quote, max_age_seconds=15)
    assert is_fresh is False
    assert age >= 40.0
    assert "stale" in reason.lower()


def test_quote_freshness_missing_timestamp():
    quote = {"priceUsd": 1.05}
    is_fresh, age, reason = FreshnessVerifier.verify_quote_freshness(quote)
    assert is_fresh is False
    assert "missing" in reason.lower()


def test_valuation_freshness():
    now_iso = (datetime.now(timezone.utc) - timedelta(seconds=10)).isoformat()
    val = {"total_usd": 150000.0, "timestamp": now_iso}
    is_fresh, age, reason = FreshnessVerifier.verify_valuation_freshness(val, max_age_seconds=30)
    assert is_fresh is True
    assert 5.0 <= age <= 15.0
