"""Pydantic schemas for the Events Portal API."""

from .auth import LoginRequest, LoginResponse, TokenPayload
from .settings import SettingBase, SettingUpdate, PasswordChange
from .link import LinkBase, LinkCreate, LinkResponse
from .photo import PhotoBase, PhotoResponse, PhotoUploadResponse
from .event import (
    EventBase,
    EventCreate,
    EventUpdate,
    EventPublicUpdate,
    EventResponse,
    EventWithRelations,
)
from .category import (
    CategoryBase,
    CategoryCreate,
    CategoryResponse,
    CategoryWithEvents,
)

__all__ = [
    # Auth
    "LoginRequest",
    "LoginResponse",
    "TokenPayload",
    # Settings
    "SettingBase",
    "SettingUpdate",
    "PasswordChange",
    # Link
    "LinkBase",
    "LinkCreate",
    "LinkResponse",
    # Photo
    "PhotoBase",
    "PhotoResponse",
    "PhotoUploadResponse",
    # Event
    "EventBase",
    "EventCreate",
    "EventUpdate",
    "EventPublicUpdate",
    "EventResponse",
    "EventWithRelations",
    # Category
    "CategoryBase",
    "CategoryCreate",
    "CategoryResponse",
    "CategoryWithEvents",
]
