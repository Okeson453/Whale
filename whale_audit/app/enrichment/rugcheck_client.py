"""
Rugcheck client for SPL token risk assessment.
"""

from typing import Dict, Any, Optional
import httpx
from whale_audit.app.config import settings


class RugcheckClient:
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or settings.rugcheck_api_url

    async def get_token_report(self, mint_address: str) -> Dict[str, Any]:
        """
        Check token contract safety, liquidity locks, and honeypot indicators.
        """
        if settings.trading_mode == "dry_run":
            return {
                "mint": mint_address,
                "score": 92,
                "risks": [],
                "rugged": False,
                "tokenMeta": {"name": "Verified SPL Token"},
            }

        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{self.base_url}/tokens/{mint_address}/report")
            resp.raise_for_status()
            return resp.json()
