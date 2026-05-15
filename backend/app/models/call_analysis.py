import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CallAnalysis(Base):
    __tablename__ = "call_analyses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id: Mapped[str] = mapped_column(ForeignKey("calls.id"), unique=True, nullable=False)
    overall_score: Mapped[float] = mapped_column(Float, nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=True)
    scores_json: Mapped[str] = mapped_column(Text, nullable=True)
    strengths_json: Mapped[str] = mapped_column(Text, nullable=True)
    missed_opportunities_json: Mapped[str] = mapped_column(Text, nullable=True)
    objections_json: Mapped[str] = mapped_column(Text, nullable=True)
    buying_signals_json: Mapped[str] = mapped_column(Text, nullable=True)
    manager_notes_json: Mapped[str] = mapped_column(Text, nullable=True)
    coaching_drill: Mapped[str] = mapped_column(Text, nullable=True)
    follow_up_sms: Mapped[str] = mapped_column(Text, nullable=True)
    follow_up_email_subject: Mapped[str] = mapped_column(String, nullable=True)
    follow_up_email_body: Mapped[str] = mapped_column(Text, nullable=True)
    raw_ai_json: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    call = relationship("Call", back_populates="analysis")
