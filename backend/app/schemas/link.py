"""Link schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LinkBase(BaseModel):
    """Base schema for link."""

    url: str
    title: str | None = None


class LinkCreate(LinkBase):
    """Schema for creating a link."""

    pass


class LinkResponse(BaseModel):
    """Schema for link response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    url: str
    title: str | None = None
    created_at: datetime
