"""Add operator actions audit logging and risk settings.

Revision ID: b8f1c0d42a77
Revises: d3240d7c3516
Create Date: 2026-10-17 12:30:00.000000
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b8f1c0d42a77'
down_revision: Union[str, None] = 'd3240d7c3516'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'operator_action_logs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('operator_id', sa.String(64), nullable=False),
        sa.Column('action_type', sa.String(64), nullable=False),
        sa.Column('payload_json', sa.Text(), default='{}'),
        sa.Column('ip_address', sa.String(45), default='127.0.0.1'),
        sa.Column('status', sa.String(32), default='SUCCESS'),
        sa.Column('timestamp', sa.DateTime(), default=sa.func.now()),
        sa.Column('details', sa.Text(), nullable=True),
    )

    op.create_table(
        'risk_settings',
        sa.Column('id', sa.Integer(), primary_key=True, default=1),
        sa.Column('max_position_size_sol', sa.Float(), default=5.0),
        sa.Column('max_total_exposure_sol', sa.Float(), default=50.0),
        sa.Column('daily_loss_limit_sol', sa.Float(), default=10.0),
        sa.Column('max_slippage_bps', sa.Integer(), default=150),
        sa.Column('trading_mode', sa.String(32), default='dry_run'),
        sa.Column('live_trading_enabled', sa.Boolean(), default=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_by', sa.String(64), default='system'),
    )


def downgrade() -> None:
    op.drop_table('risk_settings')
    op.drop_table('operator_action_logs')
