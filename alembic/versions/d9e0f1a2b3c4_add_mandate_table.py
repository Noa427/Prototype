"""add_mandate_table

Revision ID: d9e0f1a2b3c4
Revises: c8d9e0f1a2b3
Create Date: 2026-04-28 10:01:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd9e0f1a2b3c4'
down_revision: Union[str, Sequence[str], None] = 'c8d9e0f1a2b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'mandate',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agency_id', sa.Integer(), nullable=False),
        sa.Column('mandate_number', sa.Integer(), nullable=False),
        sa.Column('mandate_type', sa.String(), nullable=False),
        sa.Column('property_address', sa.String(), nullable=False),
        sa.Column('owner_name', sa.String(), nullable=False),
        sa.Column('owner_email', sa.String(), nullable=True),
        sa.Column('owner_phone', sa.String(), nullable=True),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=False),
        sa.Column('exclusive', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('commission_rate', sa.Float(), nullable=False, server_default='3.0'),
        sa.Column('status', sa.String(), nullable=False, server_default='actif'),
        sa.Column('document_path', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['agency_id'], ['agency.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_mandate_agency_id', 'mandate', ['agency_id'])


def downgrade() -> None:
    op.drop_index('ix_mandate_agency_id', table_name='mandate')
    op.drop_table('mandate')
