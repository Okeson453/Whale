"""
Execution guardrails and pre-signing revalidation.
"""

from typing import Dict, Any, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from whale_audit.app.config import settings
from whale_audit.app.execution.freshness import FreshnessVerifier
from whale_audit.app.state.circuit_breaker import CircuitBreakerManager
from whale_audit.app.state.models import TokenWhitelist


class ExecutionGuardrails:
    @staticmethod
    async def validate_pre_signing(
        db: AsyncSession,
        quote: Dict[str, Any],
        token_address: str,
        amount_sol: float,
        expected_price: float,
    ) -> Tuple[bool, str]:
        # 1. Circuit breaker check
        breaker_ok, breaker_reason = await CircuitBreakerManager.check_execution_permitted(db)
        if not breaker_ok:
            return False, f"Guardrail rejected by circuit breaker: {breaker_reason}"

        # 2. Token whitelist and blacklist check
        result = await db.execute(select(TokenWhitelist).where(TokenWhitelist.mint_address == token_address))
        token_info = result.scalar_one_or_none()
        if token_info:
            if token_info.is_blacklisted:
                return False, f"Token {token_address} is explicitly blacklisted"
            if not token_info.is_whitelisted:
                return False, f"Token {token_address} is not on the active whitelist"
            if token_info.rugcheck_score and token_info.rugcheck_score < 70:
                return False, f"Token rugcheck score ({token_info.rugcheck_score}) below safety threshold of 70"

        # 3. Quote freshness check
        is_fresh, age, fresh_reason = FreshnessVerifier.verify_quote_freshness(
            quote, max_age_seconds=settings.quote_freshness_ttl_seconds
        )
        if not is_fresh:
            return False, f"Pre-signing failed: {fresh_reason}"

        # 4. Slippage tolerance validation
        slippage_bps = quote.get("slippageBps", 0)
        if slippage_bps > settings.max_slippage_bps:
            return False, f"Quoted slippage {slippage_bps} bps exceeds max limit of {settings.max_slippage_bps} bps"

        # 5. Price divergence check
        quoted_price = float(quote.get("priceUsd", 0.0) or quote.get("outAmount", 0.0))
        if expected_price > 0 and quoted_price > 0:
            price_delta_pct = abs(quoted_price - expected_price) / expected_price * 100.0
            if price_delta_pct > 3.0:
                return False, f"Adverse price movement: {price_delta_pct:.2f}% deviation from expected price"

        # 6. Position size limits
        if amount_sol > settings.max_position_size_sol:
            return False, f"Amount {amount_sol} SOL exceeds max position size {settings.max_position_size_sol} SOL"

        return True, "Pre-signing validation passed successfully"
