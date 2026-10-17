"""
Tests for trailing stop evaluator.
"""

from whale_audit.app.execution.trailing_stop import TrailingStopEvaluator


def test_trailing_stop_not_triggered():
    should_exit, stop_price, drawdown = TrailingStopEvaluator.evaluate_stop(
        entry_price=80.0,
        highest_price=100.0,
        current_price=95.0,
        trailing_stop_pct=10.0,
    )
    assert should_exit is False
    assert stop_price == 90.0
    assert drawdown == 5.0


def test_trailing_stop_triggered_on_drawdown():
    should_exit, stop_price, drawdown = TrailingStopEvaluator.evaluate_stop(
        entry_price=80.0,
        highest_price=100.0,
        current_price=88.0,
        trailing_stop_pct=10.0,
    )
    assert should_exit is True
    assert stop_price == 90.0
    assert drawdown == 12.0
