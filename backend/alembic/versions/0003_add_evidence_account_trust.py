"""add evidence, account settings, and consent controls

Revision ID: 0003_add_evidence_account_trust
Revises: 0002_add_sales_psychology
Create Date: 2026-05-19
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003_add_evidence_account_trust"
down_revision: str | None = "0002_add_sales_psychology"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    json_doc = sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql")

    op.add_column("call_analyses", sa.Column("evidence", json_doc, nullable=True))
    op.add_column("calls", sa.Column("consent_confirmed", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("calls", sa.Column("consent_notes", sa.Text(), nullable=True))
    op.add_column("organizations", sa.Column("coaching_framework", json_doc, nullable=True))
    op.add_column("organizations", sa.Column("data_retention_days", sa.Integer(), nullable=False, server_default="90"))
    op.add_column(
        "organizations",
        sa.Column("recording_consent_required", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "organizations",
        sa.Column("pii_redaction_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("organizations", "pii_redaction_enabled")
    op.drop_column("organizations", "recording_consent_required")
    op.drop_column("organizations", "data_retention_days")
    op.drop_column("organizations", "coaching_framework")
    op.drop_column("calls", "consent_notes")
    op.drop_column("calls", "consent_confirmed")
    op.drop_column("call_analyses", "evidence")
