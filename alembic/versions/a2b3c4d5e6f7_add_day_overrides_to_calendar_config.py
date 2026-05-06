"""add_day_overrides_to_calendar_config

Revision ID: a2b3c4d5e6f7
Revises: 683bb5252ae2
Create Date: 2026-05-06 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = '683bb5252ae2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('calendarconfig', sa.Column('day_overrides', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('calendarconfig', 'day_overrides')
