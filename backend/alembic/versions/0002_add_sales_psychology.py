"""add sales psychology analysis

Revision ID: 0002_add_sales_psychology
Revises: 0001_initial_schema
Create Date: 2026-05-16
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002_add_sales_psychology"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    json_doc = sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql")
    op.add_column("call_analyses", sa.Column("sales_psychology", json_doc, nullable=True))


def downgrade() -> None:
    op.drop_column("call_analyses", "sales_psychology")
