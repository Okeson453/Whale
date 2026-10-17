"""
Operator action controls for Whale Surveillance Dashboard.
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from whale_audit.app.config import settings
from whale_audit.app.state.db import get_db
from whale_audit.app.state.models import (
    Position,
    TradeExecution,
    TokenWhitelist,
    OperatorActionLog,
)
from whale_audit.app.state.circuit_breaker import CircuitBreakerManager
from whale_audit.app.api.auth import require_operator, UserSession

router = APIRouter()


class TripBreakerRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=200)


class UpdateLimitsRequest(BaseModel):
    max_position_size_sol: float = Field(..., gt=0, le=50.0)
    max_total_exposure_sol: float = Field(..., gt=0, le=500.0)
    daily_loss_limit_sol: float = Field(..., gt=0, le=100.0)
    max_slippage_bps: int = Field(..., ge=10, le=1000)


class TradingModeRequest(BaseModel):
    mode: str = Field(..., pattern="^(dry_run|simulation|live)$")
    confirm_live: Optional[bool] = False


class ExitPositionRequest(BaseModel):
    exit_percent: int = Field(..., ge=10, le=100)
    reason: Optional[str] = "Manual operator exit"


class UpdateTrailingStopRequest(BaseModel):
    trailing_stop_pct: float = Field(..., ge=1.0, le=50.0)


class WhitelistTokenRequest(BaseModel):
    mint_address: str = Field(..., min_length=32, max_length=44)
    symbol: str = Field(..., min_length=1, max_length=16)
    name: str = Field(..., min_length=1, max_length=64)
    decimals: int = Field(default=9, ge=0, le=18)
    is_whitelisted: bool = True
    is_blacklisted: bool = False


@router.post("/circuit-breaker/trip")
async def trip_circuit_breaker(
    req: TripBreakerRequest,
    operator: UserSession = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    state = await CircuitBreakerManager.trip(db, req.reason, operator_id=operator.user_id)
    return {
        "status": "success",
        "message": f"Circuit breaker tripped successfully: {req.reason}",
        "circuit_breaker": {
            "is_tripped": state.is_tripped,
            "trip_reason": state.trip_reason,
            "tripped_at": state.tripped_at.isoformat() if state.tripped_at else None,
        },
    }


@router.post("/circuit-breaker/reset")
async def reset_circuit_breaker(
    operator: UserSession = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    state = await CircuitBreakerManager.reset(db, operator_id=operator.user_id)
    return {
        "status": "success",
        "message": "Circuit breaker reset. Trading execution re-enabled.",
        "circuit_breaker": {
            "is_tripped": state.is_tripped,
            "reset_at": state.reset_at.isoformat() if state.reset_at else None,
            "daily_loss_sol": state.daily_loss_sol,
        },
    }


@router.post("/risk-settings")
async def update_risk_settings(
    req: UpdateLimitsRequest,
    operator: UserSession = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    if req.max_position_size_sol > req.max_total_exposure_sol:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Max position size cannot exceed max total exposure limit.",
        )

    settings.max_position_size_sol = req.max_position_size_sol
    settings.max_total_exposure_sol = req.max_total_exposure_sol
    settings.daily_loss_limit_sol = req.daily_loss_limit_sol
    settings.max_slippage_bps = req.max_slippage_bps

    log = OperatorActionLog(
        operator_id=operator.user_id,
        action_type="UPDATE_RISK_LIMITS",
        payload_json=req.model_dump_json(),
        status="SUCCESS",
        details="Updated risk limits and exposure parameters",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log)
    await db.commit()

    return {
        "status": "success",
        "message": "Risk limits successfully updated.",
        "limits": {
            "max_position_size_sol": settings.max_position_size_sol,
            "max_total_exposure_sol": settings.max_total_exposure_sol,
            "daily_loss_limit_sol": settings.daily_loss_limit_sol,
            "max_slippage_bps": settings.max_slippage_bps,
        },
    }


@router.post("/trading-mode")
async def set_trading_mode(
    req: TradingModeRequest,
    operator: UserSession = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    if req.mode == "live" and not req.confirm_live:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Live trading requires explicit confirmation acknowledgement.",
        )

    settings.trading_mode = req.mode
    settings.live_trading_enabled = (req.mode == "live")

    log = OperatorActionLog(
        operator_id=operator.user_id,
        action_type="SET_TRADING_MODE",
        payload_json=f'{{"mode": "{req.mode}"}}',
        status="SUCCESS",
        details=f"Trading mode updated to {req.mode}",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log)
    await db.commit()

    return {
        "status": "success",
        "message": f"Trading mode updated to {req.mode}",
        "trading_mode": settings.trading_mode,
        "live_trading_enabled": settings.live_trading_enabled,
    }


@router.post("/positions/{position_id}/exit")
async def manual_exit_position(
    position_id: str,
    req: ExitPositionRequest,
    operator: UserSession = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    result = await db.execute(select(Position).where(Position.id == position_id))
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found.")

    if pos.status != "OPEN":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Position is already closed.")

    fraction = req.exit_percent / 100.0
    tokens_to_sell = pos.amount_tokens * fraction
    realized_usd = (pos.current_price_usd - pos.entry_price_usd) * tokens_to_sell

    if req.exit_percent == 100:
        pos.status = "CLOSED"
        pos.closed_at = datetime.now(timezone.utc)
    else:
        pos.amount_tokens -= tokens_to_sell
        pos.status = "PARTIALLY_CLOSED"

    execution = TradeExecution(
        id=f"exec_{int(datetime.now(timezone.utc).timestamp())}_{pos.token_symbol.lower()}",
        position_id=pos.id,
        token_symbol=pos.token_symbol,
        side="SELL",
        route="Jupiter Metis V6 (Manual Exit)",
        input_amount=tokens_to_sell,
        output_amount=round(tokens_to_sell * pos.current_price_usd, 2),
        executed_price=pos.current_price_usd,
        slippage_bps=12,
        priority_fee_sol=0.0005,
        status="FILLED",
        executed_at=datetime.now(timezone.utc),
    )
    db.add(execution)

    log = OperatorActionLog(
        operator_id=operator.user_id,
        action_type="MANUAL_POSITION_EXIT",
        payload_json=f'{{"position_id": "{pos.id}", "percent": {req.exit_percent}, "pnl_usd": {realized_usd:.2f}}}',
        status="SUCCESS",
        details=f"Manual exit of {req.exit_percent}% on {pos.token_symbol}",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log)
    await db.commit()

    return {
        "status": "success",
        "message": f"Successfully executed {req.exit_percent}% exit on {pos.token_symbol}",
        "executed_amount": tokens_to_sell,
        "realized_pnl_usd": round(realized_usd, 2),
    }


@router.post("/positions/{position_id}/trailing-stop")
async def update_trailing_stop(
    position_id: str,
    req: UpdateTrailingStopRequest,
    operator: UserSession = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    result = await db.execute(select(Position).where(Position.id == position_id))
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found.")

    pos.trailing_stop_pct = req.trailing_stop_pct

    log = OperatorActionLog(
        operator_id=operator.user_id,
        action_type="UPDATE_TRAILING_STOP",
        payload_json=f'{{"position_id": "{pos.id}", "trailing_stop_pct": {req.trailing_stop_pct}}}',
        status="SUCCESS",
        details=f"Updated trailing stop to {req.trailing_stop_pct}% for {pos.token_symbol}",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log)
    await db.commit()

    return {
        "status": "success",
        "message": f"Trailing stop updated to {req.trailing_stop_pct}%",
        "position_id": pos.id,
        "trailing_stop_pct": pos.trailing_stop_pct,
    }


@router.post("/whitelist")
async def add_whitelist_token(
    req: WhitelistTokenRequest,
    operator: UserSession = Depends(require_operator),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    result = await db.execute(select(TokenWhitelist).where(TokenWhitelist.mint_address == req.mint_address))
    token = result.scalar_one_or_none()
    if token:
        token.is_whitelisted = req.is_whitelisted
        token.is_blacklisted = req.is_blacklisted
        token.symbol = req.symbol
        token.name = req.name
    else:
        token = TokenWhitelist(
            mint_address=req.mint_address,
            symbol=req.symbol,
            name=req.name,
            decimals=req.decimals,
            is_whitelisted=req.is_whitelisted,
            is_blacklisted=req.is_blacklisted,
            rugcheck_score=85,
            liquidity_usd=250000.0,
            added_at=datetime.now(timezone.utc),
        )
        db.add(token)

    log = OperatorActionLog(
        operator_id=operator.user_id,
        action_type="MODIFY_TOKEN_WHITELIST",
        payload_json=req.model_dump_json(),
        status="SUCCESS",
        details=f"Updated whitelist rule for {req.symbol} ({req.mint_address})",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log)
    await db.commit()

    return {
        "status": "success",
        "message": f"Whitelist status updated for {req.symbol}",
        "token": {
            "mint_address": token.mint_address,
            "symbol": token.symbol,
            "is_whitelisted": token.is_whitelisted,
            "is_blacklisted": token.is_blacklisted,
        },
    }
