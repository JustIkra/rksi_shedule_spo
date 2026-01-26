"""Event schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator

from .link import LinkResponse
from .photo import PhotoResponse


class _Unset:
    """Sentinel value for fields that were not provided in the request.

    This is used at runtime to distinguish between:
    - Field not provided in request (UNSET)
    - Field explicitly set to null (None)
    - Field set to a value ("some text")
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __repr__(self):
        return "UNSET"


UNSET = _Unset()


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
    """Schema for updating an event (public user) - only description.

    Uses a sentinel pattern to distinguish between "not provided" and "explicitly null".
    After parsing, check if description is UNSET (not provided) vs None (explicitly null).
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    # We store the raw value here, but the actual logic to detect UNSET happens post-init
    _description_raw: str | None = None
    _description_was_provided: bool = False

    description: str | None = None

    def __init__(self, **data):
        # Track if description was explicitly provided in the input
        was_provided = "description" in data
        super().__init__(**data)
        object.__setattr__(self, "_description_was_provided", was_provided)

    @field_validator("description", mode="before")
    @classmethod
    def normalize_description(cls, v):
        """Normalize description: strip whitespace, convert empty to None."""
        if v is None:
            return None
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v

    def get_description_or_unset(self):
        """Return description value or UNSET if not provided."""
        if not self._description_was_provided:
            return UNSET
        return self.description


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
