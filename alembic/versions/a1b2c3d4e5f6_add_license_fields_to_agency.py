"""add license fields to agency

Revision ID: a1b2c3d4e5f6
Revises: fefc144a426c
Create Date: 2026-04-17 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'fefc144a426c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('agency', sa.Column('license_key', sa.String(), nullable=True))
    op.add_column('agency', sa.Column('last_heartbeat', sa.DateTime(), nullable=True))
    op.add_column('agency', sa.Column('expires_at', sa.DateTime(), nullable=True))

    # Backfill existing rows with unique UUIDs
    op.execute("""
        UPDATE agency SET license_key = CAST(gen_random_uuid() AS TEXT)
        WHERE license_key IS NULL
    """)

    op.alter_column('agency', 'license_key', nullable=False)
    op.create_unique_constraint('uq_agency_license_key', 'agency', ['license_key'])
    op.create_index('ix_agency_license_key', 'agency', ['license_key'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_agency_license_key', table_name='agency')
    op.drop_constraint('uq_agency_license_key', 'agency', type_='unique')
    op.drop_column('agency', 'expires_at')
    op.drop_column('agency', 'last_heartbeat')
    op.drop_column('agency', 'license_key')
