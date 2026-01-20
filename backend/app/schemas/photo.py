"""Photo schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PhotoBase(BaseModel):
    """Base schema for photo."""

    filename: str
    original_path: str
    thumbnail_path: str
    file_size: int


class PhotoResponse(BaseModel):
    """Schema for photo response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    filename: str
    original_path: str
    thumbnail_path: str
    file_size: int
    created_at: datetime


class PhotoUploadResponse(BaseModel):
    """Schema for photo upload response."""

    photos: list["PhotoResponse"]
    errors: list[str]
