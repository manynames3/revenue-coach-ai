"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-15
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    json_doc = sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql")

    op.create_table(
        "organizations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("organization_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "reps",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("organization_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "calls",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("rep_id", sa.String(), nullable=False),
        sa.Column("organization_id", sa.String(), nullable=False),
        sa.Column("lead_name", sa.String(), nullable=True),
        sa.Column("lead_source", sa.String(), nullable=True),
        sa.Column("call_type", sa.String(), nullable=True),
        sa.Column("outcome", sa.String(), nullable=True),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("audio_s3_key", sa.String(), nullable=True),
        sa.Column("transcription_job_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), server_default="created", nullable=False),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("transcription_retry_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("analysis_retry_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("transcription_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("transcribed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("analysis_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("analyzed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["rep_id"], ["reps.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "call_analyses",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("call_id", sa.String(), nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("scores", json_doc, nullable=True),
        sa.Column("strengths", json_doc, nullable=True),
        sa.Column("missed_opportunities", json_doc, nullable=True),
        sa.Column("objections", json_doc, nullable=True),
        sa.Column("buying_signals", json_doc, nullable=True),
        sa.Column("manager_notes", json_doc, nullable=True),
        sa.Column("coaching_drill", sa.Text(), nullable=True),
        sa.Column("follow_up_sms", sa.Text(), nullable=True),
        sa.Column("follow_up_email_subject", sa.String(), nullable=True),
        sa.Column("follow_up_email_body", sa.Text(), nullable=True),
        sa.Column("raw_ai_json", json_doc, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["call_id"], ["calls.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("call_id"),
    )


def downgrade() -> None:
    op.drop_table("call_analyses")
    op.drop_table("calls")
    op.drop_table("reps")
    op.drop_table("users")
    op.drop_table("organizations")
