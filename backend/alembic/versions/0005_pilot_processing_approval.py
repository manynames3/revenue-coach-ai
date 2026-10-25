"""Require operator approval before incurring real processing costs."""
from alembic import op
import sqlalchemy as sa

revision = "0005_pilot_processing_approval"
down_revision = "0004_product_readiness"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("organizations", sa.Column("processing_enabled", sa.Boolean(), nullable=False,
                                           server_default=sa.false()))


def downgrade():
    op.drop_column("organizations", "processing_enabled")
