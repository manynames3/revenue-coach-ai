from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.coaching_framework import default_coaching_framework
from app.schemas.rep import RepOut


class CoachingCategory(BaseModel):
    key: str = Field(pattern=r"^[a-z][a-z0-9_]{1,39}$")
    label: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=500)
    weight: int = Field(default=10, ge=1, le=100)
    low_anchor: str = Field(default="Behavior is weak, rushed, or counterproductive.", min_length=1, max_length=500)
    high_anchor: str = Field(default="Behavior is specific, buyer-centered, and advances a clear next step.", min_length=1, max_length=500)


class CoachingFramework(BaseModel):
    name: str = Field(default="High-ticket revenue psychology", min_length=1, max_length=100)
    description: str = Field(default="", max_length=2000)
    principles: list[str] = Field(default_factory=list, max_length=8)
    score_categories: list[CoachingCategory] = Field(min_length=1, max_length=12)

    @model_validator(mode="after")
    def unique_categories(self):
        keys = [category.key for category in self.score_categories]
        if len(set(keys)) != len(keys):
            raise ValueError("Each scoring category needs a unique key.")
        if any(len(principle) > 500 for principle in self.principles):
            raise ValueError("Keep each principle under 500 characters.")
        return self


class TrustControls(BaseModel):
    data_retention_days: int = 90
    recording_consent_required: bool = True
    pii_redaction_enabled: bool = False
    audio_uploads_direct_to_s3: bool = True
    delete_call_removes_audio_artifacts: bool = True
    auth_mode: str = "private_workspace"
    redaction_scope: str = "Email addresses, phone numbers, and long account/card-like numbers"


class OrganizationOut(BaseModel):
    id: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserSeat(BaseModel):
    id: str
    email: str
    role: str = "manager"
    name: str = ""
    active: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class AccountOut(BaseModel):
    organization: OrganizationOut
    users: list[UserSeat] = []
    reps: list[RepOut] = []
    coaching_framework: CoachingFramework = Field(default_factory=lambda: CoachingFramework(**default_coaching_framework()))
    trust_controls: TrustControls = Field(default_factory=TrustControls)
    framework_version: int = 1
    offer_context: dict = Field(default_factory=dict)
    processing_enabled: bool = False


class AccountUpdate(BaseModel):
    model_config = {"extra": "forbid"}
    organization_name: str | None = None
    coaching_framework: CoachingFramework | None = None
    data_retention_days: int | None = None
    recording_consent_required: bool | None = None
    pii_redaction_enabled: bool | None = None
    offer_context: dict[str, str] | None = None
