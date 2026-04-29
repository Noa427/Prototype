# alembic/versions/e0f1a2b3c4d5_add_rental_tables.py
"""add_rental_tables

Revision ID: e0f1a2b3c4d5
Revises: d9e0f1a2b3c4
Create Date: 2026-04-29 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e0f1a2b3c4d5'
down_revision: Union[str, Sequence[str], None] = 'd9e0f1a2b3c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'rental',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agency_id', sa.Integer(), nullable=False),
        sa.Column('deal_id', sa.Integer(), nullable=True),
        sa.Column('tenant_name', sa.String(), nullable=False),
        sa.Column('tenant_email', sa.String(), nullable=False),
        sa.Column('tenant_phone', sa.String(), nullable=True),
        sa.Column('monthly_rent', sa.Float(), nullable=False),
        sa.Column('charges', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('deposit', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('notice_period_days', sa.Integer(), nullable=False, server_default='90'),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['agency_id'], ['agency.id']),
        sa.ForeignKeyConstraint(['deal_id'], ['deal.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_rental_agency_id', 'rental', ['agency_id'])

    op.create_table(
        'rentalpayment',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('rental_id', sa.Integer(), nullable=False),
        sa.Column('month', sa.DateTime(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('paid_date', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('reminder_sent_dates', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['rental_id'], ['rental.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_rentalpayment_rental_id', 'rentalpayment', ['rental_id'])

    op.create_table(
        'rentaldocument',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('rental_id', sa.Integer(), nullable=False),
        sa.Column('doc_type', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['rental_id'], ['rental.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_rentaldocument_rental_id', 'rentaldocument', ['rental_id'])


def downgrade() -> None:
    op.drop_index('ix_rentaldocument_rental_id', table_name='rentaldocument')
    op.drop_table('rentaldocument')
    op.drop_index('ix_rentalpayment_rental_id', table_name='rentalpayment')
    op.drop_table('rentalpayment')
    op.drop_index('ix_rental_agency_id', table_name='rental')
    op.drop_table('rental')
