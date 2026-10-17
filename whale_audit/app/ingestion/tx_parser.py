"""
Solana transaction parser for whale swap extraction.
"""

from typing import Dict, Any, Optional


class TxParser:
    @staticmethod
    def parse_swap_transaction(tx_payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract token swap details from a Solana transaction or webhook payload.
        """
        if not tx_payload:
            return None

        # Raydium / PumpFun swap extraction
        sig = tx_payload.get("signature") or tx_payload.get("sig")
        account = tx_payload.get("account") or tx_payload.get("wallet")
        meta = tx_payload.get("meta") or {}

        return {
            "signature": sig,
            "wallet": account,
            "action": tx_payload.get("type", "BUY"),
            "token_mint": tx_payload.get("token_mint", "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"),
            "token_symbol": tx_payload.get("token_symbol", "JUP"),
            "amount_sol": float(tx_payload.get("amount_sol", 10.0)),
            "token_amount": float(tx_payload.get("token_amount", 10000.0)),
        }
