import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.call_status import CallStatus
from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Call(Base):
    __tablename__ = "calls"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    rep_id: Mapped[str] = mapped_column(ForeignKey("reps.id"), nullable=False)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    lead_name: Mapped[str | None] = mapped_column(String, nullable=True)
    lead_source: Mapped[str | None] = mapped_column(String, nullable=True)
    call_type: Mapped[str | None] = mapped_column(String, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String, nullable=True)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_s3_key: Mapped[str | None] = mapped_column(String, nullable=True)
    transcription_job_id: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default=CallStatus.CREATED.value)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    transcription_retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    analysis_retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    transcription_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    transcribed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    analysis_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    analyzed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    rep = relationship("Rep", back_populates="calls")
    organization = relationship("Organization", back_populates="calls")
    analysis = relationship(
        "CallAnalysis",
        back_populates="call",
        cascade="all, delete-orphan",
        uselist=False,
    )
