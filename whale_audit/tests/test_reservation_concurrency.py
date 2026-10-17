"""
Tests for atomic capital reservation and concurrency protection.
"""

import pytest
from whale_audit.app.execution.reservations import CapitalReservationManager
from whale_audit.app.config import settings


@pytest.mark.asyncio
async def test_capital_reservation_lifecycle(db_session):
    CapitalReservationManager._active_reservations.clear()

    ok, err = await CapitalReservationManager.request_reservation(db_session, "res_1", 2.0)
    assert ok is True
    assert err is None
    assert await CapitalReservationManager.get_total_reserved_sol() == 2.0

    ok, err = await CapitalReservationManager.request_reservation(
        db_session, "res_oversize", settings.max_position_size_sol + 10.0
    )
    assert ok is False
    assert "exceeds max single position" in err

    await CapitalReservationManager.release_reservation("res_1")
    assert await CapitalReservationManager.get_total_reserved_sol() == 0.0


@pytest.mark.asyncio
async def test_concurrent_reservations_respect_exposure_cap(db_session):
    CapitalReservationManager._active_reservations.clear()

    near_limit = settings.max_total_exposure_sol - 1.0
    CapitalReservationManager._active_reservations["res_base"] = near_limit

    ok, err = await CapitalReservationManager.request_reservation(db_session, "res_overflow", 3.0)
    assert ok is False
    assert "exceeds maximum exposure cap" in err

    CapitalReservationManager._active_reservations.clear()
