"""
Trailing stop evaluator.
"""

from typing import Tuple


class TrailingStopEvaluator:
    @staticmethod
    def evaluate_stop(
        entry_price: float,
        highest_price: float,
        current_price: float,
        trailing_stop_pct: float,
    ) -> Tuple[bool, float, float]:
        if highest_price <= 0 or current_price <= 0:
            return False, 0.0, 0.0

        stop_price = highest_price * (1.0 - (trailing_stop_pct / 100.0))
        drawdown_pct = ((highest_price - current_price) / highest_price) * 100.0

        should_exit = current_price <= stop_price
        return should_exit, stop_price, max(0.0, drawdown_pct)
