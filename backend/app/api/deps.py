"""
Common dependencies for API endpoints.

Provides reusable dependencies for:
- Database session injection
- Authentication and authorization
"""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import async_session_maker
from ..schemas.auth import TokenPayload

settings = get_settings()

# HTTP Bearer security scheme
security = HTTPBearer()


async def get_db() -> AsyncSession:
    """
    Dependency for getting async database session.

    Yields:
        AsyncSession: Database session that auto-commits on success
        and rolls back on exception.

    Usage:
        @router.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]
) -> TokenPayload:
    """
    Dependency for extracting and validating current user from JWT token.

    Args:
        credentials: HTTP Bearer credentials from Authorization header.

    Returns:
        TokenPayload: Decoded token payload with user information.

    Raises:
        HTTPException: 401 if token is invalid or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )

        sub: str | None = payload.get("sub")
        exp: int | None = payload.get("exp")
        is_admin: bool = payload.get("is_admin", False)

        if sub is None or exp is None:
            raise credentials_exception

        # Check if token is expired
        exp_datetime = datetime.fromtimestamp(exp, tz=timezone.utc)
        if exp_datetime < datetime.now(timezone.utc):
            raise credentials_exception

        return TokenPayload(
            sub=sub,
            exp=exp_datetime,
            is_admin=is_admin
        )

    except JWTError:
        raise credentials_exception


async def get_current_admin(
    current_user: Annotated[TokenPayload, Depends(get_current_user)]
) -> TokenPayload:
    """
    Dependency for ensuring current user has admin privileges.

    Args:
        current_user: The authenticated user from get_current_user dependency.

    Returns:
        TokenPayload: Token payload if user is admin.

    Raises:
        HTTPException: 403 if user is not an admin.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


# Type aliases for cleaner dependency injection
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[TokenPayload, Depends(get_current_user)]
CurrentAdmin = Annotated[TokenPayload, Depends(get_current_admin)]
