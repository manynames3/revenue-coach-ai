from datetime import datetime

from pydantic import BaseModel, Field

from app.coaching_framework import default_coaching_framework
from app.schemas.rep import RepOut


class CoachingCategory(BaseModel):
    key: str
    label: str
    description: str = ""
    weight: int = 10


class CoachingFramework(BaseModel):
    name: str = "High-ticket revenue psychology"
    description: str = ""
    principles: list[str] = Field(default_factory=list)
    score_categories: list[CoachingCategory] = Field(default_factory=list)


class TrustControls(BaseModel):
    data_retention_days: int = 90
    recording_consent_required: bool = True
    pii_redaction_enabled: bool = False
    audio_uploads_direct_to_s3: bool = True
    delete_call_removes_audio_artifacts: bool = True
    auth_mode: str = "demo_workspace"


class OrganizationOut(BaseModel):
    id: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserSeat(BaseModel):
    id: str
    email: str
    role: str = "manager"
    created_at: datetime

    model_config = {"from_attributes": True}


class AccountOut(BaseModel):
    organization: OrganizationOut
    users: list[UserSeat] = []
    reps: list[RepOut] = []
    coaching_framework: CoachingFramework = Field(default_factory=lambda: CoachingFramework(**default_coaching_framework()))
    trust_controls: TrustControls = Field(default_factory=TrustControls)


class AccountUpdate(BaseModel):
    organization_name: str | None = None
    coaching_framework: CoachingFramework | None = None
    data_retention_days: int | None = None
    recording_consent_required: bool | None = None
    pii_redaction_enabled: bool | None = None
