"""
Evidence-based freshness verification for quotes and asset valuations.
"""

from datetime import datetime, timezone
from typing import Dict, Any, Tuple


class FreshnessVerifier:
    @staticmethod
    def verify_quote_freshness(quote_data: Dict[str, Any], max_age_seconds: int = 15) -> Tuple[bool, float, str]:
        if not quote_data:
            return False, 999.0, "Quote data is missing or empty"
        
        quote_ts = quote_data.get("timestamp") or quote_data.get("time") or quote_data.get("received_at")
        if not quote_ts:
            return False, 999.0, "Quote timestamp missing from provider payload"

        try:
            if isinstance(quote_ts, (int, float)):
                if quote_ts > 1e11:
                    quote_time = datetime.fromtimestamp(quote_ts / 1000.0, tz=timezone.utc)
                else:
                    quote_time = datetime.fromtimestamp(quote_ts, tz=timezone.utc)
            elif isinstance(quote_ts, str):
                quote_time = datetime.fromisoformat(quote_ts.replace("Z", "+00:00"))
            elif isinstance(quote_ts, datetime):
                quote_time = quote_ts if quote_ts.tzinfo else quote_ts.replace(tzinfo=timezone.utc)
            else:
                return False, 999.0, "Unsupported quote timestamp format"
        except Exception as e:
            return False, 999.0, f"Failed to parse quote timestamp: {str(e)}"

        now = datetime.now(timezone.utc)
        age = (now - quote_time).total_seconds()

        if age < -1.0:
            return False, age, f"Quote timestamp is in the future by {-age:.1f}s"
        
        if age > max_age_seconds:
            return False, age, f"Quote is stale: age {age:.1f}s exceeds maximum allowed TTL of {max_age_seconds}s"

        return True, max(0.0, age), "Quote is fresh"

    @staticmethod
    def verify_valuation_freshness(valuation_data: Dict[str, Any], max_age_seconds: int = 30) -> Tuple[bool, float, str]:
        if not valuation_data:
            return False, 999.0, "Valuation payload empty"
        
        val_ts = valuation_data.get("timestamp") or valuation_data.get("last_updated")
        if not val_ts:
            return False, 999.0, "Valuation timestamp missing"

        try:
            if isinstance(val_ts, (int, float)):
                val_time = datetime.fromtimestamp(val_ts if val_ts < 1e11 else val_ts / 1000.0, tz=timezone.utc)
            elif isinstance(val_ts, str):
                val_time = datetime.fromisoformat(val_ts.replace("Z", "+00:00"))
            elif isinstance(val_ts, datetime):
                val_time = val_ts if val_ts.tzinfo else val_ts.replace(tzinfo=timezone.utc)
            else:
                return False, 999.0, "Unsupported valuation timestamp"
        except Exception as e:
            return False, 999.0, f"Invalid valuation timestamp: {str(e)}"

        now = datetime.now(timezone.utc)
        age = (now - val_time).total_seconds()

        if age > max_age_seconds:
            return False, age, f"Valuation is stale: {age:.1f}s > {max_age_seconds}s"

        return True, max(0.0, age), "Valuation is fresh"
