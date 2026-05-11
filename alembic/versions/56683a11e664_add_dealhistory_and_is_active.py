"""add_dealhistory_and_is_active

Revision ID: 56683a11e664
Revises: 332dbbb934fd
Create Date: 2026-04-04 19:55:30.817541

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '56683a11e664'
down_revision: Union[str, Sequence[str], None] = '332dbbb934fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
