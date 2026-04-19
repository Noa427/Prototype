"""merge_heads

Revision ID: 06f05fe2bd0a
Revises: 4f72017327b0, b3c4d5e6f7a8
Create Date: 2026-04-19 16:20:06.051133

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '06f05fe2bd0a'
down_revision: Union[str, Sequence[str], None] = ('4f72017327b0', 'b3c4d5e6f7a8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
