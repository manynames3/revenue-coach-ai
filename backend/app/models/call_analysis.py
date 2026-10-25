import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.types import json_document_type


class CallAnalysis(Base):
    __tablename__ = "call_analyses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id: Mapped[str] = mapped_column(
        ForeignKey("calls.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    overall_score: Mapped[float] = mapped_column(Float, nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=True)
    scores: Mapped[dict[str, Any]] = mapped_column(json_document_type(), nullable=True)
    strengths: Mapped[list[str]] = mapped_column(json_document_type(), nullable=True)
    missed_opportunities: Mapped[list[str]] = mapped_column(json_document_type(), nullable=True)
    objections: Mapped[list[dict[str, Any]]] = mapped_column(json_document_type(), nullable=True)
    buying_signals: Mapped[list[dict[str, Any]]] = mapped_column(json_document_type(), nullable=True)
    manager_notes: Mapped[list[str]] = mapped_column(json_document_type(), nullable=True)
    evidence: Mapped[list[dict[str, Any]]] = mapped_column(json_document_type(), nullable=True)
    score_reasons: Mapped[dict | None] = mapped_column(json_document_type(), nullable=True)
    rubric_snapshot: Mapped[dict | None] = mapped_column(json_document_type(), nullable=True)
    evidence_coverage: Mapped[float | None] = mapped_column(Float, nullable=True)
    source_mode: Mapped[str] = mapped_column(String, nullable=False, default="legacy")
    model_name: Mapped[str | None] = mapped_column(String, nullable=True)
    feedback_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    review_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feedback_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sales_psychology: Mapped[dict[str, Any]] = mapped_column(json_document_type(), nullable=True)
    coaching_drill: Mapped[str] = mapped_column(Text, nullable=True)
    follow_up_sms: Mapped[str] = mapped_column(Text, nullable=True)
    follow_up_email_subject: Mapped[str] = mapped_column(String, nullable=True)
    follow_up_email_body: Mapped[str] = mapped_column(Text, nullable=True)
    raw_ai_json: Mapped[dict[str, Any]] = mapped_column(json_document_type(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    call = relationship("Call", back_populates="analysis")
