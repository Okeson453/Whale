"""
Client for isolated remote transaction signer service.
Enforces separation of duties: trading logic never handles private keys directly.
"""

from typing import Dict, Any, Optional
import httpx
from whale_audit.app.config import settings


class SecureSignerClient:
    def __init__(self, signer_url: Optional[str] = None):
        self.signer_url = signer_url or settings.signer_service_url

    async def sign_transaction(
        self, serialized_tx_b64: str, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Request isolated signing of a validated transaction.
        In dry_run mode, simulates signature safely without network call.
        """
        if settings.trading_mode == "dry_run" or not settings.live_trading_enabled:
            return {
                "success": True,
                "signed_tx_b64": f"simulated_signed_{serialized_tx_b64[:20]}...",
                "signature": f"simulated_sig_{context.get('intent_id', 'dry_run')}",
                "mode": "dry_run",
            }

        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                response = await client.post(
                    f"{self.signer_url}/sign",
                    json={"tx": serialized_tx_b64, "context": context},
                    headers={"Authorization": f"Bearer {settings.operator_token}"},
                )
                if response.status_code == 200:
                    return response.json()
                return {
                    "success": False,
                    "error": f"Signer returned error {response.status_code}: {response.text}",
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to connect to isolated signer service: {str(e)}",
                }
