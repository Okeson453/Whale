"""
Trading agent orchestrator coordinating opportunity scoring, risk evaluation, and execution.
"""

from typing import Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from whale_audit.app.config import settings
from whale_audit.app.execution.guardrails import ExecutionGuardrails
from whale_audit.app.execution.reservations import CapitalReservationManager
from whale_audit.app.state.circuit_breaker import CircuitBreakerManager


class AgentOrchestrator:
    @staticmethod
    async def process_signal(
        db: AsyncSession, signal_data: Dict[str, Any]
    ) -> Tuple[bool, str]:
        """
        End-to-end signal processing pipeline:
        1. Circuit breaker check
        2. Capital reservation
        3. Pre-signing guardrail validation
        """
        amount_sol = float(signal_data.get("amount_sol", 1.0))
        token_address = signal_data.get("token_address", "")
        intent_id = f"intent_{signal_data.get('id', 'test')}"

        # Step 1: Circuit breaker check
        permitted, reason = await CircuitBreakerManager.check_execution_permitted(db)
        if not permitted:
            return False, f"Orchestrator blocked: {reason}"

        # Step 2: Capital reservation
        reserved, res_err = await CapitalReservationManager.request_reservation(
            db, intent_id, amount_sol
        )
        if not reserved:
            return False, f"Capital reservation failed: {res_err}"

        try:
            # Step 3: Pre-signing guardrail check
            import time
            quote_mock = {
                "priceUsd": float(signal_data.get("price_usd", 1.0)),
                "slippageBps": 50,
                "timestamp": time.time(),
            }
            guard_ok, guard_reason = await ExecutionGuardrails.validate_pre_signing(
                db=db,
                quote=quote_mock,
                token_address=token_address,
                amount_sol=amount_sol,
                expected_price=float(signal_data.get("price_usd", 1.0)),
            )

            if not guard_ok:
                await CapitalReservationManager.release_reservation(intent_id)
                return False, f"Guardrail rejected: {guard_reason}"

            # Step 4: Commit reservation
            await CapitalReservationManager.commit_reservation(intent_id)
            return True, "Signal processed and copy-trade validated successfully"

        except Exception as e:
            await CapitalReservationManager.release_reservation(intent_id)
            return False, f"Pipeline exception: {str(e)}"
