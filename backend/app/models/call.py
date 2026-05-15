import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Call(Base):
    __tablename__ = "calls"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    rep_id: Mapped[str] = mapped_column(ForeignKey("reps.id"), nullable=False)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    lead_name: Mapped[str] = mapped_column(String, nullable=True)
    lead_source: Mapped[str] = mapped_column(String, nullable=True)
    call_type: Mapped[str] = mapped_column(String, nullable=True)
    outcome: Mapped[str] = mapped_column(String, nullable=True)
    transcript: Mapped[str] = mapped_column(Text, nullable=True)
    audio_s3_key: Mapped[str] = mapped_column(String, nullable=True)
    transcription_job_id: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    rep = relationship("Rep", back_populates="calls")
    organization = relationship("Organization", back_populates="calls")
    analysis = relationship("CallAnalysis", back_populates="call", uselist=False)
