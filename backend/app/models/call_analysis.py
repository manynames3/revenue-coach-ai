import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CallAnalysis(Base):
    __tablename__ = "call_analyses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id: Mapped[str] = mapped_column(ForeignKey("calls.id"), unique=True, nullable=False)
    overall_score: Mapped[float] = mapped_column(Float, nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=True)
    scores: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=True)
    strengths: Mapped[list[str]] = mapped_column(JSONB, nullable=True)
    missed_opportunities: Mapped[list[str]] = mapped_column(JSONB, nullable=True)
    objections: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    buying_signals: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    manager_notes: Mapped[list[str]] = mapped_column(JSONB, nullable=True)
    coaching_drill: Mapped[str] = mapped_column(Text, nullable=True)
    follow_up_sms: Mapped[str] = mapped_column(Text, nullable=True)
    follow_up_email_subject: Mapped[str] = mapped_column(String, nullable=True)
    follow_up_email_body: Mapped[str] = mapped_column(Text, nullable=True)
    raw_ai_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    call = relationship("Call", back_populates="analysis")
