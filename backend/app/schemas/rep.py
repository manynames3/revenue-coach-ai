from datetime import datetime

from pydantic import BaseModel


class RepCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    organization_id: str | None = None


class RepOut(BaseModel):
    id: str
    name: str
    email: str | None = None
    phone: str | None = None
    organization_id: str
    user_id: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
