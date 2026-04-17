"""add calendar config

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
Create Date: 2026-04-17 01:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'calendarconfig',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False, unique=True),
        sa.Column('work_days', sa.String(), nullable=False, server_default='1,2,3,4,5'),
        sa.Column('start_time', sa.String(), nullable=False, server_default='09:00'),
        sa.Column('end_time', sa.String(), nullable=False, server_default='18:00'),
        sa.Column('slot_duration', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('lunch_start', sa.String(), nullable=False, server_default='12:00'),
        sa.Column('lunch_end', sa.String(), nullable=False, server_default='13:00'),
        sa.Column('excluded_dates', sa.String(), nullable=False, server_default=''),
        sa.Column('calendar_url', sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('calendarconfig')
