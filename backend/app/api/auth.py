"""
Authentication API endpoints.

Provides endpoints for:
- Public user login
- Admin login
- Session validation
- Logout
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request, status
from jose import jwt

from ..config import get_settings
from ..database import get_system_setting, verify_password
from ..schemas.auth import LoginRequest, LoginResponse, TokenPayload
from .deps import CurrentUser
from ..rate_limiter import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

settings = get_settings()


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Dictionary of claims to encode in the token.
        expires_delta: Optional custom expiration time.
            Defaults to access_token_expire_days from settings.

    Returns:
        Encoded JWT token string.
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.access_token_expire_days
        )

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm
    )
    return encoded_jwt


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(request: Request, login_data: LoginRequest) -> LoginResponse:
    """
    Authenticate public user with password.

    Verifies the provided password against the stored public_password
    and returns a JWT token valid for 30 days.

    Args:
        request: Login request containing password.

    Returns:
        LoginResponse: JWT access token.

    Raises:
        HTTPException: 401 if password is invalid.
    """
    # Get hashed public password from database
    stored_hash = await get_system_setting("public_password")

    if stored_hash is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="System not configured"
        )

    if not verify_password(login_data.password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create token with is_admin=False for public users
    access_token = create_access_token(
        data={"sub": "public_user", "is_admin": False}
    )

    return LoginResponse(access_token=access_token)


@router.post("/admin/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def admin_login(request: Request, login_data: LoginRequest) -> LoginResponse:
    """
    Authenticate admin user with password.

    Verifies the provided password against the stored admin_password
    and returns a JWT token with admin privileges.

    Args:
        request: Login request containing admin password.

    Returns:
        LoginResponse: JWT access token with is_admin=True.

    Raises:
        HTTPException: 401 if password is invalid.
    """
    # Get hashed admin password from database
    stored_hash = await get_system_setting("admin_password")

    if stored_hash is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="System not configured"
        )

    if not verify_password(login_data.password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create token with is_admin=True for admin users
    access_token = create_access_token(
        data={"sub": "admin_user", "is_admin": True}
    )

    return LoginResponse(access_token=access_token)


@router.get("/check")
async def check_session(current_user: CurrentUser) -> dict:
    """
    Check if current session is valid.

    Validates the JWT token from Authorization header and returns
    session status with admin flag.

    Args:
        current_user: Token payload from authenticated user.

    Returns:
        Dictionary with valid=True and is_admin flag.
    """
    return {
        "valid": True,
        "is_admin": current_user.is_admin
    }


@router.post("/logout")
async def logout() -> dict:
    """
    Logout current user.

    Since JWT tokens are stateless, actual token invalidation
    happens on the client side by removing the stored token.

    Returns:
        Dictionary with success=True.
    """
    return {"success": True}
