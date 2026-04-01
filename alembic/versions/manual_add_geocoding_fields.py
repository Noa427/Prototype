"""add geocoding fields to deal

Revision ID: manual_add_geocoding_fields
Revises: initial   # si tu as une migration initiale ; sinon, laisse None
Create Date: 2026-04-01

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'manual_add_geocoding_fields'
down_revision = None   # Si tu n'as pas de migration initiale, laisse None
branch_labels = None
depends_on = None

def upgrade():
    # Ajoute les colonnes une par une
    op.add_column('deal', sa.Column('street_number', sa.String(), nullable=True))
    op.add_column('deal', sa.Column('street', sa.String(), nullable=True))
    op.add_column('deal', sa.Column('postal_code', sa.String(), nullable=True))
    op.add_column('deal', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('deal', sa.Column('longitude', sa.Float(), nullable=True))
    op.add_column('deal', sa.Column('amenities', sa.JSON(), nullable=True))

def downgrade():
    op.drop_column('deal', 'amenities')
    op.drop_column('deal', 'longitude')
    op.drop_column('deal', 'latitude')
    op.drop_column('deal', 'postal_code')
    op.drop_column('deal', 'street')
    op.drop_column('deal', 'street_number')
