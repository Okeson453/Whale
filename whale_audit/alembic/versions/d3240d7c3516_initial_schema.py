"""Initial database schema.

Revision ID: d3240d7c3516
Revises: 
Create Date: 2026-10-17 12:00:00.000000
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd3240d7c3516'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'whale_wallets',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('address', sa.String(64), unique=True, index=True, nullable=False),
        sa.Column('label', sa.String(128), nullable=False),
        sa.Column('tag', sa.String(64), default='Smart Trader'),
        sa.Column('risk_tier', sa.String(32), default='Tier 1'),
        sa.Column('win_rate_30d', sa.Float(), default=0.0),
        sa.Column('pnl_30d_sol', sa.Float(), default=0.0),
        sa.Column('tx_count', sa.Integer(), default=0),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now()),
    )

    op.create_table(
        'whale_signals',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('wallet_address', sa.String(64), index=True, nullable=False),
        sa.Column('wallet_label', sa.String(128), default=''),
        sa.Column('token_address', sa.String(64), index=True, nullable=False),
        sa.Column('token_symbol', sa.String(32), nullable=False),
        sa.Column('action', sa.String(16), nullable=False),
        sa.Column('amount_sol', sa.Float(), default=0.0),
        sa.Column('token_amount', sa.Float(), default=0.0),
        sa.Column('price_usd', sa.Float(), default=0.0),
        sa.Column('confidence_score', sa.Float(), default=0.0),
        sa.Column('status', sa.String(32), default='DETECTED'),
        sa.Column('detected_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('metadata_json', sa.Text(), default='{}'),
    )

    op.create_table(
        'positions',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('signal_id', sa.String(64), nullable=True),
        sa.Column('token_address', sa.String(64), index=True, nullable=False),
        sa.Column('token_symbol', sa.String(32), nullable=False),
        sa.Column('entry_price_usd', sa.Float(), nullable=False),
        sa.Column('current_price_usd', sa.Float(), nullable=False),
        sa.Column('amount_tokens', sa.Float(), nullable=False),
        sa.Column('invested_sol', sa.Float(), nullable=False),
        sa.Column('unrealized_pnl_usd', sa.Float(), default=0.0),
        sa.Column('unrealized_pnl_pct', sa.Float(), default=0.0),
        sa.Column('status', sa.String(32), default='OPEN'),
        sa.Column('trailing_stop_pct', sa.Float(), default=15.0),
        sa.Column('highest_price_usd', sa.Float(), default=0.0),
        sa.Column('opened_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'trade_executions',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('position_id', sa.String(64), nullable=True),
        sa.Column('token_symbol', sa.String(32), nullable=False),
        sa.Column('side', sa.String(16), nullable=False),
        sa.Column('route', sa.String(64), default='Jupiter Metis'),
        sa.Column('input_amount', sa.Float(), default=0.0),
        sa.Column('output_amount', sa.Float(), default=0.0),
        sa.Column('executed_price', sa.Float(), default=0.0),
        sa.Column('slippage_bps', sa.Integer(), default=0),
        sa.Column('priority_fee_sol', sa.Float(), default=0.0),
        sa.Column('status', sa.String(32), default='FILLED'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('executed_at', sa.DateTime(), default=sa.func.now()),
    )

    op.create_table(
        'circuit_breaker_state',
        sa.Column('id', sa.Integer(), primary_key=True, default=1),
        sa.Column('is_tripped', sa.Boolean(), default=False),
        sa.Column('trip_reason', sa.String(256), nullable=True),
        sa.Column('tripped_at', sa.DateTime(), nullable=True),
        sa.Column('reset_at', sa.DateTime(), nullable=True),
        sa.Column('daily_loss_sol', sa.Float(), default=0.0),
        sa.Column('daily_baseline_sol', sa.Float(), default=100.0),
        sa.Column('consecutive_failures', sa.Integer(), default=0),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now()),
    )

    op.create_table(
        'token_whitelist',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('mint_address', sa.String(64), unique=True, index=True, nullable=False),
        sa.Column('symbol', sa.String(32), nullable=False),
        sa.Column('name', sa.String(128), nullable=False),
        sa.Column('decimals', sa.Integer(), default=9),
        sa.Column('is_whitelisted', sa.Boolean(), default=True),
        sa.Column('is_blacklisted', sa.Boolean(), default=False),
        sa.Column('rugcheck_score', sa.Integer(), default=90),
        sa.Column('liquidity_usd', sa.Float(), default=500000.0),
        sa.Column('added_at', sa.DateTime(), default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('token_whitelist')
    op.drop_table('circuit_breaker_state')
    op.drop_table('trade_executions')
    op.drop_table('positions')
    op.drop_table('whale_signals')
    op.drop_table('whale_wallets')
