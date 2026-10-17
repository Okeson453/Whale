"""
Tests for database schema migrations and integrity.
"""

import pytest
from sqlalchemy import text
from whale_audit.app.state.models import Base


@pytest.mark.asyncio
async def test_all_expected_tables_exist(db_session):
    expected_tables = {
        'whale_wallets',
        'whale_signals',
        'positions',
        'trade_executions',
        'circuit_breaker_state',
        'risk_settings',
        'token_whitelist',
        'operator_action_logs',
    }

    metadata_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(metadata_tables)


@pytest.mark.asyncio
async def test_query_integrity(db_session):
    # Verify basic query execution
    result = await db_session.execute(text("SELECT count(*) FROM whale_wallets"))
    count = result.scalar()
    assert count >= 0
