"""
Atomic capital reservation manager.
"""

import asyncio
from typing import Dict, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from whale_audit.app.config import settings
from whale_audit.app.state.models import Position


class CapitalReservationManager:
    _lock = asyncio.Lock()
    _active_reservations: Dict[str, float] = {}

    @classmethod
    async def get_total_reserved_sol(cls) -> float:
        async with cls._lock:
            return sum(cls._active_reservations.values())

    @classmethod
    async def request_reservation(
        cls, db: AsyncSession, reservation_id: str, amount_sol: float
    ) -> Tuple[bool, Optional[str]]:
        if amount_sol <= 0:
            return False, "Reservation amount must be positive"

        if amount_sol > settings.max_position_size_sol:
            return False, f"Requested amount {amount_sol} SOL exceeds max single position limit {settings.max_position_size_sol} SOL"

        async with cls._lock:
            if reservation_id in cls._active_reservations:
                return False, f"Reservation {reservation_id} already exists"

            result = await db.execute(
                select(func.sum(Position.invested_sol)).where(Position.status == "OPEN")
            )
            current_invested = result.scalar() or 0.0
            currently_reserved = sum(cls._active_reservations.values())
            projected_exposure = current_invested + currently_reserved + amount_sol

            if projected_exposure > settings.max_total_exposure_sol:
                return False, f"Projected exposure {projected_exposure:.2f} SOL exceeds maximum exposure cap {settings.max_total_exposure_sol:.2f} SOL"

            cls._active_reservations[reservation_id] = amount_sol
            return True, None

    @classmethod
    async def release_reservation(cls, reservation_id: str) -> None:
        async with cls._lock:
            cls._active_reservations.pop(reservation_id, None)

    @classmethod
    async def commit_reservation(cls, reservation_id: str) -> None:
        async with cls._lock:
            cls._active_reservations.pop(reservation_id, None)
