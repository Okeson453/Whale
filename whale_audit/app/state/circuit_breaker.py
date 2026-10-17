"""
Circuit breaker implementation with authoritative state and daily-loss baseline calculations.
"""

from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from whale_audit.app.config import settings
from whale_audit.app.state.models import CircuitBreakerState, OperatorActionLog


class CircuitBreakerManager:
    @staticmethod
    async def get_or_create_state(db: AsyncSession) -> CircuitBreakerState:
        result = await db.execute(select(CircuitBreakerState).where(CircuitBreakerState.id == 1))
        state = result.scalar_one_or_none()
        if not state:
            state = CircuitBreakerState(
                id=1,
                is_tripped=False,
                trip_reason=None,
                daily_loss_sol=0.0,
                daily_baseline_sol=100.0,
                consecutive_failures=0,
                updated_at=datetime.now(timezone.utc),
            )
            db.add(state)
            await db.commit()
            await db.refresh(state)
        return state

    @classmethod
    async def check_execution_permitted(cls, db: AsyncSession) -> Tuple[bool, Optional[str]]:
        state = await cls.get_or_create_state(db)
        if state.is_tripped:
            return False, f"Circuit breaker tripped: {state.trip_reason}"
        
        # Check daily loss limit against baseline
        if state.daily_loss_sol >= settings.daily_loss_limit_sol:
            await cls.trip(db, f"Daily loss limit exceeded: {state.daily_loss_sol:.2f} SOL >= {settings.daily_loss_limit_sol:.2f} SOL", operator_id="system_watchdog")
            return False, f"Daily loss limit exceeded: {state.daily_loss_sol:.2f} SOL"

        if state.consecutive_failures >= settings.circuit_breaker_max_consecutive_failures:
            await cls.trip(db, f"Consecutive failure threshold exceeded ({state.consecutive_failures})", operator_id="system_watchdog")
            return False, "Consecutive execution failure threshold reached"

        return True, None

    @classmethod
    async def record_failure(cls, db: AsyncSession, reason: str) -> CircuitBreakerState:
        state = await cls.get_or_create_state(db)
        state.consecutive_failures += 1
        state.updated_at = datetime.now(timezone.utc)
        if state.consecutive_failures >= settings.circuit_breaker_max_consecutive_failures:
            state.is_tripped = True
            state.trip_reason = f"Consecutive failures ({state.consecutive_failures}): {reason}"
            state.tripped_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(state)
        return state

    @classmethod
    async def record_success(cls, db: AsyncSession, pnl_sol: float = 0.0) -> CircuitBreakerState:
        state = await cls.get_or_create_state(db)
        state.consecutive_failures = 0
        if pnl_sol < 0:
            state.daily_loss_sol += abs(pnl_sol)
        state.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(state)
        return state

    @classmethod
    async def trip(cls, db: AsyncSession, reason: str, operator_id: str = "operator") -> CircuitBreakerState:
        state = await cls.get_or_create_state(db)
        state.is_tripped = True
        state.trip_reason = reason
        state.tripped_at = datetime.now(timezone.utc)
        state.updated_at = datetime.now(timezone.utc)

        log = OperatorActionLog(
            operator_id=operator_id,
            action_type="TRIP_CIRCUIT_BREAKER",
            payload_json=f'{{"reason": "{reason}"}}',
            status="SUCCESS",
            details=f"Circuit breaker manually or automatically tripped: {reason}",
            timestamp=datetime.now(timezone.utc),
        )
        db.add(log)
        await db.commit()
        await db.refresh(state)
        return state

    @classmethod
    async def reset(cls, db: AsyncSession, operator_id: str = "operator") -> CircuitBreakerState:
        state = await cls.get_or_create_state(db)
        state.is_tripped = False
        state.trip_reason = None
        state.consecutive_failures = 0
        state.daily_loss_sol = 0.0
        state.reset_at = datetime.now(timezone.utc)
        state.updated_at = datetime.now(timezone.utc)

        log = OperatorActionLog(
            operator_id=operator_id,
            action_type="RESET_CIRCUIT_BREAKER",
            payload_json='{"action": "reset"}',
            status="SUCCESS",
            details="Circuit breaker cleared and daily loss counter reset by operator",
            timestamp=datetime.now(timezone.utc),
        )
        db.add(log)
        await db.commit()
        await db.refresh(state)
        return state
