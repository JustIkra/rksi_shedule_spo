"""
Events API router for Events Portal.

Provides endpoints for:
- GET /: List events by month (grouped by categories)
- GET /{event_id}: Get single event with relations
- PATCH /{event_id}: Update event description (requires auth)
"""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models.category import Category
from app.models.event import Event
from app.schemas.category import CategoryWithEvents
from app.schemas.event import EventPublicUpdate, EventResponse, EventWithRelations

router = APIRouter()


@router.get(
    "/",
    response_model=list[CategoryWithEvents],
    summary="Get events by month",
    description="Returns all categories with their events for the specified month. "
    "Categories are sorted by sort_order, events within each category are also sorted by sort_order.",
)
async def get_events_by_month(
    db: DbSession,
    month: Annotated[int, Query(ge=1, le=12, description="Month number (1-12)")],
) -> list[CategoryWithEvents]:
    """
    Get all events for a specific month, grouped by categories.

    Args:
        db: Database session.
        month: Month number (1-12).

    Returns:
        List of categories with their events, including links and photos for each event.
    """
    # Query categories with events for the specified month
    # Using selectinload for efficient loading of nested relations
    stmt = (
        select(Category)
        .where(Category.month == month)
        .options(
            selectinload(Category.events).selectinload(Event.links),
            selectinload(Category.events).selectinload(Event.photos),
        )
        .order_by(Category.sort_order)
    )

    result = await db.execute(stmt)
    categories = result.scalars().unique().all()

    # Sort events within each category by sort_order
    response = []
    for category in categories:
        # Sort events by sort_order
        sorted_events = sorted(category.events, key=lambda e: e.sort_order)

        # Create response with sorted events
        category_data = CategoryWithEvents(
            id=category.id,
            name=category.name,
            month=category.month,
            sort_order=category.sort_order,
            events=[
                EventResponse(
                    id=event.id,
                    number=event.number,
                    name=event.name,
                    event_date=event.event_date,
                    responsible=event.responsible,
                    location=event.location,
                    description=event.description,
                    sort_order=event.sort_order,
                    category_id=event.category_id,
                    created_at=event.created_at,
                    updated_at=event.updated_at,
                )
                for event in sorted_events
            ],
        )
        response.append(category_data)

    return response


@router.get(
    "/{event_id}",
    response_model=EventWithRelations,
    summary="Get event by ID",
    description="Returns a single event with all its related links and photos.",
)
async def get_event(
    db: DbSession,
    event_id: int,
) -> EventWithRelations:
    """
    Get a single event by ID with all relations.

    Args:
        db: Database session.
        event_id: Event ID.

    Returns:
        Event with links and photos.

    Raises:
        HTTPException 404: If event not found.
    """
    stmt = (
        select(Event)
        .where(Event.id == event_id)
        .options(
            selectinload(Event.links),
            selectinload(Event.photos),
        )
    )

    result = await db.execute(stmt)
    event = result.scalar_one_or_none()

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found",
        )

    return EventWithRelations.model_validate(event)


@router.patch(
    "/{event_id}",
    response_model=EventResponse,
    summary="Update event description",
    description="Update the description field of an event. Requires authentication.",
)
async def update_event_description(
    db: DbSession,
    event_id: int,
    event_update: EventPublicUpdate,
    current_user: CurrentUser,
) -> EventResponse:
    """
    Update event description (public user endpoint).

    Only the description field can be updated through this endpoint.
    Requires authentication with a valid JWT token.

    Args:
        db: Database session.
        event_id: Event ID to update.
        event_update: Update data containing new description.
        current_user: Authenticated user (injected by dependency).

    Returns:
        Updated event data.

    Raises:
        HTTPException 404: If event not found.
    """
    stmt = select(Event).where(Event.id == event_id)
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found",
        )

    # Update only description field
    if event_update.description is not None:
        event.description = event_update.description

    # Flush changes and refresh to get updated_at
    await db.flush()
    await db.refresh(event)

    return EventResponse.model_validate(event)
