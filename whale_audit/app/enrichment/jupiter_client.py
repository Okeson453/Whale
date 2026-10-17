"""
Jupiter quote and routing API client.
"""

from typing import Dict, Any, Optional
import httpx
from whale_audit.app.config import settings


class JupiterClient:
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or settings.jupiter_api_url

    async def get_quote(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
        slippage_bps: int = 50,
    ) -> Dict[str, Any]:
        """
        Fetch swap quote from Jupiter Metis API with safe fallback simulation in dry-run mode.
        """
        if settings.trading_mode == "dry_run":
            import time
            return {
                "inputMint": input_mint,
                "outputMint": output_mint,
                "inAmount": str(amount),
                "outAmount": str(int(amount * 1.05)),
                "priceImpactPct": "0.05",
                "slippageBps": slippage_bps,
                "timestamp": time.time(),
                "routePlan": [{"swapInfo": {"label": "Raydium CPMM"}}],
            }

        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                f"{self.base_url}/quote",
                params={
                    "inputMint": input_mint,
                    "outputMint": output_mint,
                    "amount": amount,
                    "slippageBps": slippage_bps,
                },
            )
            resp.raise_for_status()
            return resp.json()
