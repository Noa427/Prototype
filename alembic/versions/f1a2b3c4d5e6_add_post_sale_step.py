"""add_post_sale_step

Revision ID: f1a2b3c4d5e6
Revises: e0f1a2b3c4d5
Create Date: 2026-04-30 09:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e0f1a2b3c4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'postsalestep',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('deal_id', sa.Integer(), nullable=False),
        sa.Column('step_name', sa.String(), nullable=False),
        sa.Column('step_order', sa.Integer(), nullable=False),
        sa.Column('due_date', sa.DateTime(), nullable=False),
        sa.Column('completed_date', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['deal_id'], ['deal.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_postsalestep_deal_id', 'postsalestep', ['deal_id'])


def downgrade() -> None:
    op.drop_index('ix_postsalestep_deal_id', table_name='postsalestep')
    op.drop_table('postsalestep')
