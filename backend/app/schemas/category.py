"""Category schemas."""

from pydantic import BaseModel, ConfigDict, Field

from .event import EventWithRelations


class CategoryBase(BaseModel):
    """Base schema for category."""

    name: str
    month: int = Field(..., ge=1, le=12, description="Month number (1-12)")
    sort_order: int = 0


class CategoryCreate(CategoryBase):
    """Schema for creating a category."""

    pass


class CategoryResponse(BaseModel):
    """Schema for category response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    month: int
    sort_order: int


class CategoryWithEvents(CategoryResponse):
    """Schema for category response with related events."""

    events: list[EventWithRelations] = []
