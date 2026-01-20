"""Event schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict

from .link import LinkResponse
from .photo import PhotoResponse


class EventBase(BaseModel):
    """Base schema for event."""

    number: str | None = None
    name: str
    event_date: str | None = None
    responsible: str | None = None
    location: str | None = None
    description: str | None = None
    sort_order: int = 0


class EventCreate(EventBase):
    """Schema for creating an event."""

    category_id: int


class EventUpdate(BaseModel):
    """Schema for updating an event (admin)."""

    number: str | None = None
    name: str | None = None
    event_date: str | None = None
    responsible: str | None = None
    location: str | None = None
    description: str | None = None
    sort_order: int | None = None
    category_id: int | None = None


class EventPublicUpdate(BaseModel):
    """Schema for updating an event (public user) - only description."""

    description: str | None = None


class EventResponse(BaseModel):
    """Schema for event response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str | None = None
    name: str
    event_date: str | None = None
    responsible: str | None = None
    location: str | None = None
    description: str | None = None
    sort_order: int
    category_id: int
    created_at: datetime
    updated_at: datetime


class EventWithRelations(EventResponse):
    """Schema for event response with related links and photos."""

    links: list[LinkResponse] = []
    photos: list[PhotoResponse] = []
