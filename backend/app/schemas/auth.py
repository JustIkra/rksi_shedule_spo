"""Authentication schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    """Schema for login request."""

    password: str


class LoginResponse(BaseModel):
    """Schema for login response with JWT token."""

    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Schema for JWT token payload."""

    model_config = ConfigDict(from_attributes=True)

    sub: str
    exp: datetime
    is_admin: bool
