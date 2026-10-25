"""Private workspaces, verified scoring, and the coaching loop."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004_product_readiness"
down_revision = "0003_add_evidence_account_trust"
branch_labels = None
depends_on = None


def upgrade():
    doc = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")
    for table, columns in [
        ("users", [sa.Column("name", sa.String(), nullable=False, server_default=""),
                   sa.Column("role", sa.String(), nullable=False, server_default="manager"),
                   sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.false())]),
        ("organizations", [sa.Column("framework_version", sa.Integer(), nullable=False, server_default="1"),
                           sa.Column("offer_context", doc, nullable=True)]),
        ("calls", [sa.Column("transcript_segments", doc, nullable=True),
                   sa.Column("is_sample", sa.Boolean(), nullable=False, server_default=sa.false())]),
        ("call_analyses", [sa.Column("score_reasons", doc, nullable=True),
                          sa.Column("rubric_snapshot", doc, nullable=True),
                          sa.Column("evidence_coverage", sa.Float(), nullable=True),
                          sa.Column("source_mode", sa.String(), nullable=False, server_default="legacy"),
                          sa.Column("model_name", sa.String(), nullable=True),
                          sa.Column("feedback_rating", sa.Integer(), nullable=True),
                          sa.Column("review_seconds", sa.Integer(), nullable=True),
                          sa.Column("feedback_at", sa.DateTime(timezone=True), nullable=True)]),
    ]:
        for column in columns:
            op.add_column(table, column)
    with op.batch_alter_table("reps") as batch:
        batch.add_column(sa.Column("user_id", sa.String(), nullable=True))
        batch.create_foreign_key("fk_rep_user", "users", ["user_id"], ["id"])
        batch.create_unique_constraint("uq_rep_user", ["user_id"])
    op.create_table("auth_sessions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("csrf_token", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False))
    op.create_table("invitations",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("organization_id", sa.String(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("email", sa.String(), nullable=False), sa.Column("role", sa.String(), nullable=False),
        sa.Column("token_hash", sa.String(), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table("audit_events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("organization_id", sa.String(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("actor_id", sa.String(), nullable=True), sa.Column("action", sa.String(), nullable=False),
        sa.Column("details", doc, nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_table("rate_limits",
        sa.Column("id", sa.String(), primary_key=True), sa.Column("count", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False))
    op.create_table("analysis_jobs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("call_id", sa.String(), sa.ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("organization_id", sa.String(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("state", sa.String(), nullable=False), sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("lease_token", sa.String(), nullable=True),
        sa.Column("lease_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rubric_snapshot", doc, nullable=False), sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_table("coaching_assignments",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("organization_id", sa.String(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("rep_id", sa.String(), sa.ForeignKey("reps.id"), nullable=False),
        sa.Column("call_id", sa.String(), sa.ForeignKey("calls.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("skill", sa.String(), nullable=False), sa.Column("instructions", sa.Text(), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False), sa.Column("state", sa.String(), nullable=False),
        sa.Column("practice_response", sa.Text(), nullable=True), sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("verification_call_id", sa.String(), sa.ForeignKey("calls.id", ondelete="SET NULL"), nullable=True),
        sa.Column("baseline_score", sa.Float(), nullable=True), sa.Column("verified_score", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table("pilot_requests",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("organization_id", sa.String(), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("name", sa.String(), nullable=False), sa.Column("email", sa.String(), nullable=False),
        sa.Column("company", sa.String(), nullable=False), sa.Column("team_size", sa.Integer(), nullable=False),
        sa.Column("goal", sa.Text(), nullable=False), sa.Column("state", sa.String(), nullable=False),
        sa.Column("invoice_reference", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_table("password_resets",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_table("password_resets")
    for table in ("pilot_requests", "coaching_assignments", "analysis_jobs", "rate_limits",
                  "audit_events", "invitations", "auth_sessions"):
        op.drop_table(table)
    with op.batch_alter_table("reps") as batch:
        batch.drop_constraint("uq_rep_user", type_="unique")
        batch.drop_constraint("fk_rep_user", type_="foreignkey")
        batch.drop_column("user_id")
    for table, columns in [
        ("call_analyses", ["score_reasons", "rubric_snapshot", "evidence_coverage", "source_mode", "model_name",
                         "feedback_rating", "review_seconds", "feedback_at"]),
        ("calls", ["transcript_segments", "is_sample"]),
        ("organizations", ["framework_version", "offer_context"]),
        ("users", ["name", "role", "active"]),
    ]:
        for column in columns:
            op.drop_column(table, column)
