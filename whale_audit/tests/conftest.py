"""
Pytest configuration and async test fixtures.
"""

import asyncio
from datetime import datetime, timezone
from typing import AsyncGenerator
import pytest
import pytest_asyncio
import httpx
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from whale_audit.app.config import settings
from whale_audit.app.state.models import (
    Base,
    WhaleWallet,
    TokenWhitelist,
    CircuitBreakerState,
)
from whale_audit.app.state.db import get_db
from whale_audit.app.main import app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with test_session_factory() as session:
        cb = CircuitBreakerState(
            id=1,
            is_tripped=False,
            trip_reason=None,
            daily_loss_sol=0.0,
            daily_baseline_sol=100.0,
            consecutive_failures=0,
            updated_at=datetime.now(timezone.utc),
        )
        wallet = WhaleWallet(
            address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
            label="Alpha Whale",
            tag="Smart Dex Trader",
            risk_tier="Tier 1",
            win_rate_30d=75.0,
            pnl_30d_sol=350.0,
            tx_count=120,
            is_active=True,
        )
        token = TokenWhitelist(
            mint_address="So11111111111111111111111111111111111111112",
            symbol="SOL",
            name="Wrapped SOL",
            decimals=9,
            is_whitelisted=True,
            is_blacklisted=False,
            rugcheck_score=99,
            liquidity_usd=10000000.0,
        )
        session.add_all([cb, wallet, token])
        await session.commit()

        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[httpx.AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
