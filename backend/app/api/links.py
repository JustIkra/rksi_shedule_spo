"""
API endpoints for managing event links.

Provides endpoints for:
- Listing links for an event
- Creating new links (requires authentication)
- Deleting links (requires authentication)
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.event_link import EventLink
from app.schemas.link import LinkCreate, LinkResponse

router = APIRouter()
settings = get_settings()

# Security scheme for JWT Bearer token
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Dependency to validate JWT token and extract user information.

    Args:
        credentials: Bearer token from Authorization header.

    Returns:
        dict: Token payload with user information.

    Raises:
        HTTPException: 401 if token is invalid or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        sub: str = payload.get("sub")
        if sub is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception


@router.get(
    "/events/{event_id}/links",
    response_model=list[LinkResponse],
    summary="Get event links",
    description="Retrieve all links associated with a specific event, sorted by creation date (newest first).",
)
async def get_event_links(
    event_id: int,
    db: AsyncSession = Depends(get_db),
) -> list[LinkResponse]:
    """
    Get all links for a specific event.

    Args:
        event_id: The ID of the event to get links for.
        db: Database session.

    Returns:
        List of links sorted by created_at DESC.
    """
    result = await db.execute(
        select(EventLink)
        .where(EventLink.event_id == event_id)
        .order_by(EventLink.created_at.desc())
    )
    links = result.scalars().all()
    return links


@router.post(
    "/events/{event_id}/links",
    response_model=LinkResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create event link",
    description="Add a new link to an event. Requires authentication.",
)
async def create_event_link(
    event_id: int,
    link_data: LinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> LinkResponse:
    """
    Create a new link for an event.

    Args:
        event_id: The ID of the event to add link to.
        link_data: Link creation data (url, title).
        db: Database session.
        current_user: Authenticated user (from JWT).

    Returns:
        Created link with ID and timestamps.
    """
    new_link = EventLink(
        event_id=event_id,
        url=link_data.url,
        title=link_data.title,
    )
    db.add(new_link)
    await db.flush()
    await db.refresh(new_link)
    return new_link


@router.delete(
    "/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete link",
    description="Delete a link by ID. Requires authentication.",
)
async def delete_link(
    link_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> None:
    """
    Delete a link by ID.

    Args:
        link_id: The ID of the link to delete.
        db: Database session.
        current_user: Authenticated user (from JWT).

    Raises:
        HTTPException: 404 if link not found.
    """
    result = await db.execute(
        select(EventLink).where(EventLink.id == link_id)
    )
    link = result.scalar_one_or_none()

    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found",
        )

    await db.delete(link)
