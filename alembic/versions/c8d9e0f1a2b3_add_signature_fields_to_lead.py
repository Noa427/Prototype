"""add_signature_fields_to_lead

Revision ID: c8d9e0f1a2b3
Revises: 6440dba64c97
Create Date: 2026-04-28 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c8d9e0f1a2b3'
down_revision: Union[str, Sequence[str], None] = '6440dba64c97'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('lead', sa.Column('signature_request_id', sa.String(), nullable=True))
    op.add_column('lead', sa.Column('signature_status', sa.String(), nullable=False, server_default='none'))


def downgrade() -> None:
    op.drop_column('lead', 'signature_status')
    op.drop_column('lead', 'signature_request_id')
