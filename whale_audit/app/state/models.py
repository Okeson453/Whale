"""
SQLAlchemy ORM models for Whale Surveillance Dashboard.
"""

from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class WhaleWallet(Base):
    __tablename__ = "whale_wallets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    address = Column(String(64), unique=True, index=True, nullable=False)
    label = Column(String(128), nullable=False)
    tag = Column(String(64), default="Smart Trader")
    risk_tier = Column(String(32), default="Tier 1")
    win_rate_30d = Column(Float, default=0.0)
    pnl_30d_sol = Column(Float, default=0.0)
    tx_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WhaleSignal(Base):
    __tablename__ = "whale_signals"

    id = Column(String(64), primary_key=True)
    wallet_address = Column(String(64), index=True, nullable=False)
    wallet_label = Column(String(128), default="")
    token_address = Column(String(64), index=True, nullable=False)
    token_symbol = Column(String(32), nullable=False)
    action = Column(String(16), nullable=False)  # BUY or SELL
    amount_sol = Column(Float, default=0.0)
    token_amount = Column(Float, default=0.0)
    price_usd = Column(Float, default=0.0)
    confidence_score = Column(Float, default=0.0)
    status = Column(String(32), default="DETECTED")  # DETECTED, APPROVED, REJECTED, EXECUTED
    detected_at = Column(DateTime, default=datetime.utcnow)
    metadata_json = Column(Text, default="{}")


class Position(Base):
    __tablename__ = "positions"

    id = Column(String(64), primary_key=True)
    signal_id = Column(String(64), nullable=True)
    token_address = Column(String(64), index=True, nullable=False)
    token_symbol = Column(String(32), nullable=False)
    entry_price_usd = Column(Float, nullable=False)
    current_price_usd = Column(Float, nullable=False)
    amount_tokens = Column(Float, nullable=False)
    invested_sol = Column(Float, nullable=False)
    unrealized_pnl_usd = Column(Float, default=0.0)
    unrealized_pnl_pct = Column(Float, default=0.0)
    status = Column(String(32), default="OPEN")  # OPEN, CLOSED, PARTIALLY_CLOSED
    trailing_stop_pct = Column(Float, default=15.0)
    highest_price_usd = Column(Float, default=0.0)
    opened_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)


class TradeExecution(Base):
    __tablename__ = "trade_executions"

    id = Column(String(64), primary_key=True)
    position_id = Column(String(64), nullable=True)
    token_symbol = Column(String(32), nullable=False)
    side = Column(String(16), nullable=False)  # BUY or SELL
    route = Column(String(64), default="Jupiter Metis")
    input_amount = Column(Float, default=0.0)
    output_amount = Column(Float, default=0.0)
    executed_price = Column(Float, default=0.0)
    slippage_bps = Column(Integer, default=0)
    priority_fee_sol = Column(Float, default=0.0)
    status = Column(String(32), default="FILLED")  # PENDING, FILLED, REJECTED, FAILED
    error_message = Column(Text, nullable=True)
    executed_at = Column(DateTime, default=datetime.utcnow)


class CircuitBreakerState(Base):
    __tablename__ = "circuit_breaker_state"

    id = Column(Integer, primary_key=True, default=1)
    is_tripped = Column(Boolean, default=False)
    trip_reason = Column(String(256), nullable=True)
    tripped_at = Column(DateTime, nullable=True)
    reset_at = Column(DateTime, nullable=True)
    daily_loss_sol = Column(Float, default=0.0)
    daily_baseline_sol = Column(Float, default=100.0)
    consecutive_failures = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RiskSettings(Base):
    __tablename__ = "risk_settings"

    id = Column(Integer, primary_key=True, default=1)
    max_position_size_sol = Column(Float, default=5.0)
    max_total_exposure_sol = Column(Float, default=50.0)
    daily_loss_limit_sol = Column(Float, default=10.0)
    max_slippage_bps = Column(Integer, default=150)
    trading_mode = Column(String(32), default="dry_run")
    live_trading_enabled = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String(64), default="system")


class TokenWhitelist(Base):
    __tablename__ = "token_whitelist"

    id = Column(Integer, primary_key=True, autoincrement=True)
    mint_address = Column(String(64), unique=True, index=True, nullable=False)
    symbol = Column(String(32), nullable=False)
    name = Column(String(128), nullable=False)
    decimals = Column(Integer, default=9)
    is_whitelisted = Column(Boolean, default=True)
    is_blacklisted = Column(Boolean, default=False)
    rugcheck_score = Column(Integer, default=90)
    liquidity_usd = Column(Float, default=500000.0)
    added_at = Column(DateTime, default=datetime.utcnow)


class OperatorActionLog(Base):
    __tablename__ = "operator_action_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    operator_id = Column(String(64), nullable=False)
    action_type = Column(String(64), nullable=False)
    payload_json = Column(Text, default="{}")
    ip_address = Column(String(45), default="127.0.0.1")
    status = Column(String(32), default="SUCCESS")
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(Text, nullable=True)
