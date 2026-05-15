from datetime import datetime

from pydantic import BaseModel


class RepCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    organization_id: str = "default"


class RepOut(BaseModel):
    id: str
    name: str
    email: str | None = None
    phone: str | None = None
    organization_id: str
    created_at: datetime

    model_config = {"from_attributes": True}
