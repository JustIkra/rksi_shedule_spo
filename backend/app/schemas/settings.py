"""Settings schemas."""

from pydantic import BaseModel


class SettingBase(BaseModel):
    """Base schema for settings."""

    key: str
    value: str


class SettingUpdate(BaseModel):
    """Schema for updating a setting value."""

    value: str


class PasswordChange(BaseModel):
    """Schema for changing password."""

    old_password: str
    new_password: str
