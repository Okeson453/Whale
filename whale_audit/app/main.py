"""
Main FastAPI application entry point for Whale Surveillance Dashboard.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, Any, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select
from whale_audit.app.config import settings
from whale_audit.app.state.db import init_db, async_session_factory
from whale_audit.app.state.models import (
    WhaleWallet,
    WhaleSignal,
    Position,
    TokenWhitelist,
    CircuitBreakerState,
    OperatorActionLog,
)
from whale_audit.app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await init_db()

    async with async_session_factory() as db:
        cb_res = await db.execute(select(CircuitBreakerState).where(CircuitBreakerState.id == 1))
        if not cb_res.scalar_one_or_none():
            db.add(
                CircuitBreakerState(
                    id=1,
                    is_tripped=False,
                    trip_reason=None,
                    daily_loss_sol=0.0,
                    daily_baseline_sol=100.0,
                    consecutive_failures=0,
                    updated_at=datetime.now(timezone.utc),
                )
            )

        w_res = await db.execute(select(WhaleWallet))
        if not w_res.scalars().first():
            seed_wallets = [
                WhaleWallet(
                    address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
                    label="Solana Alpha Alpha",
                    tag="Smart Dex Trader",
                    risk_tier="Tier 1",
                    win_rate_30d=78.5,
                    pnl_30d_sol=412.8,
                    tx_count=184,
                    is_active=True,
                ),
                WhaleWallet(
                    address="9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                    label="Metis Meme Sniper",
                    tag="Meme Sniper",
                    risk_tier="Tier 2",
                    win_rate_30d=64.2,
                    pnl_30d_sol=285.4,
                    tx_count=320,
                    is_active=True,
                ),
                WhaleWallet(
                    address="CuieVDEDtLo7FypA9SbLM9saXFdb1dsshveFi796umn7",
                    label="Institutional Treasury",
                    tag="Institutional",
                    risk_tier="Tier 1",
                    win_rate_30d=88.0,
                    pnl_30d_sol=1240.5,
                    tx_count=42,
                    is_active=True,
                ),
                WhaleWallet(
                    address="DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK",
                    label="PumpFun Early Accumulator",
                    tag="Insider / Whale",
                    risk_tier="Tier 2",
                    win_rate_30d=71.0,
                    pnl_30d_sol=192.3,
                    tx_count=98,
                    is_active=True,
                ),
            ]
            db.add_all(seed_wallets)

            seed_tokens = [
                TokenWhitelist(
                    mint_address="So11111111111111111111111111111111111111112",
                    symbol="SOL",
                    name="Wrapped SOL",
                    decimals=9,
                    is_whitelisted=True,
                    is_blacklisted=False,
                    rugcheck_score=99,
                    liquidity_usd=120000000.0,
                ),
                TokenWhitelist(
                    mint_address="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                    symbol="USDC",
                    name="USD Coin",
                    decimals=6,
                    is_whitelisted=True,
                    is_blacklisted=False,
                    rugcheck_score=100,
                    liquidity_usd=85000000.0,
                ),
                TokenWhitelist(
                    mint_address="JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
                    symbol="JUP",
                    name="Jupiter Exchange",
                    decimals=6,
                    is_whitelisted=True,
                    is_blacklisted=False,
                    rugcheck_score=95,
                    liquidity_usd=18500000.0,
                ),
                TokenWhitelist(
                    mint_address="DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
                    symbol="BONK",
                    name="Bonk",
                    decimals=5,
                    is_whitelisted=True,
                    is_blacklisted=False,
                    rugcheck_score=92,
                    liquidity_usd=12500000.0,
                ),
                TokenWhitelist(
                    mint_address="EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
                    symbol="WIF",
                    name="dogwifhat",
                    decimals=6,
                    is_whitelisted=True,
                    is_blacklisted=False,
                    rugcheck_score=91,
                    liquidity_usd=9800000.0,
                ),
            ]
            db.add_all(seed_tokens)

            seed_position = Position(
                id="pos_jup_01",
                signal_id="sig_jup_01",
                token_address="JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
                token_symbol="JUP",
                entry_price_usd=0.92,
                current_price_usd=1.08,
                amount_tokens=2500.0,
                invested_sol=2.3,
                unrealized_pnl_usd=400.0,
                unrealized_pnl_pct=17.39,
                status="OPEN",
                trailing_stop_pct=12.0,
                highest_price_usd=1.12,
                opened_at=datetime.now(timezone.utc),
            )
            db.add(seed_position)

            seed_signals = [
                WhaleSignal(
                    id="sig_001",
                    wallet_address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
                    wallet_label="Solana Alpha Alpha",
                    token_address="JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
                    token_symbol="JUP",
                    action="BUY",
                    amount_sol=45.0,
                    token_amount=48913.0,
                    price_usd=0.92,
                    confidence_score=94.5,
                    status="EXECUTED",
                    detected_at=datetime.now(timezone.utc),
                ),
                WhaleSignal(
                    id="sig_002",
                    wallet_address="9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                    wallet_label="Metis Meme Sniper",
                    token_address="EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
                    token_symbol="WIF",
                    action="BUY",
                    amount_sol=120.0,
                    token_amount=48000.0,
                    price_usd=2.50,
                    confidence_score=88.2,
                    status="APPROVED",
                    detected_at=datetime.now(timezone.utc),
                ),
                WhaleSignal(
                    id="sig_003",
                    wallet_address="CuieVDEDtLo7FypA9SbLM9saXFdb1dsshveFi796umn7",
                    wallet_label="Institutional Treasury",
                    token_address="DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
                    token_symbol="BONK",
                    action="BUY",
                    amount_sol=85.0,
                    token_amount=3850000000.0,
                    price_usd=0.000022,
                    confidence_score=82.0,
                    status="DETECTED",
                    detected_at=datetime.now(timezone.utc),
                ),
            ]
            db.add_all(seed_signals)

            db.add(
                OperatorActionLog(
                    operator_id="system_init",
                    action_type="SYSTEM_BOOTSTRAP",
                    payload_json='{"status": "initialized", "mode": "dry_run"}',
                    status="SUCCESS",
                    details="Database schema initialized with baseline risk parameters and whale registry",
                    timestamp=datetime.now(timezone.utc),
                )
            )

        await db.commit()

    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Enterprise Solana Whale Surveillance and Risk Management Backend",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


class SessionRequest(BaseModel):
    token: Optional[str] = None


@app.post("/api/auth/session")
async def verify_session(req: SessionRequest) -> Dict[str, Any]:
    token = req.token or settings.operator_token
    if token == settings.operator_token:
        return {
            "is_authenticated": True,
            "user_id": "operator_admin",
            "role": "operator",
            "can_execute": True,
            "can_reset_breaker": True,
            "environment": settings.environment,
            "token": settings.operator_token,
        }
    elif token == settings.readonly_token:
        return {
            "is_authenticated": True,
            "user_id": "viewer_guest",
            "role": "viewer",
            "can_execute": False,
            "can_reset_breaker": False,
            "environment": settings.environment,
            "token": settings.readonly_token,
        }
    
    return {
        "is_authenticated": False,
        "user_id": "guest",
        "role": "unauthenticated",
        "can_execute": False,
        "can_reset_breaker": False,
        "environment": settings.environment,
        "token": None,
    }


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    return {
        "status": "HEALTHY",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "app": settings.app_name,
        "trading_mode": settings.trading_mode,
        "environment": settings.environment,
    }
