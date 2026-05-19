import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.coaching_framework import default_coaching_framework
from app.database import Base
from app.models.types import json_document_type


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    coaching_framework: Mapped[dict[str, Any]] = mapped_column(
        json_document_type(), nullable=True, default=default_coaching_framework
    )
    data_retention_days: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    recording_consent_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    pii_redaction_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    reps = relationship("Rep", back_populates="organization")
    calls = relationship("Call", back_populates="organization")
