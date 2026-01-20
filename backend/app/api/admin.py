"""
Admin API endpoints for Events Portal.

Provides admin-only endpoints for:
- Full CRUD operations on events
- Category management
- Excel import/export
- Password management for public and admin access
"""

import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..config import get_settings
from ..database import (
    get_system_setting,
    set_system_setting,
    verify_password,
    get_password_hash,
)
from ..models import Category, Event, Photo
from ..schemas import (
    CategoryCreate,
    CategoryResponse,
    CategoryWithEvents,
    EventCreate,
    EventUpdate,
    EventResponse,
    PasswordChange,
)
from .deps import CurrentAdmin, DbSession
from ..services.excel_import import import_excel
from ..services.excel_export import export_excel

router = APIRouter(prefix="/admin", tags=["admin"])

settings = get_settings()


@router.get("/events", response_model=list[CategoryWithEvents])
async def get_all_events(
    admin: CurrentAdmin,
    db: DbSession,
) -> list[CategoryWithEvents]:
    """
    Get all events grouped by categories for all months.

    Returns complete list of categories with their events,
    ordered by sort_order.

    Args:
        admin: Authenticated admin user (from dependency).
        db: Database session.

    Returns:
        List of CategoryWithEvents containing all categories and events.
    """
    result = await db.execute(
        select(Category)
        .options(selectinload(Category.events))
        .order_by(Category.sort_order, Category.month)
    )
    categories = result.scalars().all()
    return categories


@router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: EventCreate,
    admin: CurrentAdmin,
    db: DbSession,
) -> EventResponse:
    """
    Create a new event.

    Args:
        event_data: Event data from request body.
        admin: Authenticated admin user (from dependency).
        db: Database session.

    Returns:
        Created event data.

    Raises:
        HTTPException: 404 if category_id does not exist.
    """
    # Verify category exists
    result = await db.execute(
        select(Category).where(Category.id == event_data.category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with id {event_data.category_id} not found"
        )

    event = Event(**event_data.model_dump())
    db.add(event)
    await db.flush()
    await db.refresh(event)

    return event


@router.put("/events/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    event_data: EventUpdate,
    admin: CurrentAdmin,
    db: DbSession,
) -> EventResponse:
    """
    Update an existing event (full update - all fields optional).

    Args:
        event_id: ID of the event to update.
        event_data: Updated event data (all fields optional).
        admin: Authenticated admin user (from dependency).
        db: Database session.

    Returns:
        Updated event data.

    Raises:
        HTTPException: 404 if event not found.
        HTTPException: 404 if new category_id does not exist.
    """
    result = await db.execute(
        select(Event).where(Event.id == event_id)
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found"
        )

    # If category_id is being changed, verify new category exists
    update_data = event_data.model_dump(exclude_unset=True)
    if "category_id" in update_data and update_data["category_id"] is not None:
        result = await db.execute(
            select(Category).where(Category.id == update_data["category_id"])
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category with id {update_data['category_id']} not found"
            )

    # Update only provided fields
    for field, value in update_data.items():
        if value is not None:
            setattr(event, field, value)

    await db.flush()
    await db.refresh(event)

    return event


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    admin: CurrentAdmin,
    db: DbSession,
) -> None:
    """
    Delete an event and its associated photos from disk.

    Cascade delete will remove associated links and photo records.
    Photo files are also deleted from the filesystem.

    Args:
        event_id: ID of the event to delete.
        admin: Authenticated admin user (from dependency).
        db: Database session.

    Raises:
        HTTPException: 404 if event not found.
    """
    result = await db.execute(
        select(Event)
        .options(selectinload(Event.photos))
        .where(Event.id == event_id)
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found"
        )

    # Delete photo files from disk
    for photo in event.photos:
        _delete_photo_files(photo)

    await db.delete(event)


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    admin: CurrentAdmin,
    db: DbSession,
) -> CategoryResponse:
    """
    Create a new category (month section).

    Args:
        category_data: Category data from request body.
        admin: Authenticated admin user (from dependency).
        db: Database session.

    Returns:
        Created category data.
    """
    category = Category(**category_data.model_dump())
    db.add(category)
    await db.flush()
    await db.refresh(category)

    return category


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    admin: CurrentAdmin,
    db: DbSession,
) -> None:
    """
    Delete a category with all its events.

    Cascade delete will remove all associated events, links, and photos.
    Photo files are also deleted from the filesystem.

    Args:
        category_id: ID of the category to delete.
        admin: Authenticated admin user (from dependency).
        db: Database session.

    Raises:
        HTTPException: 404 if category not found.
    """
    result = await db.execute(
        select(Category)
        .options(
            selectinload(Category.events).selectinload(Event.photos)
        )
        .where(Category.id == category_id)
    )
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with id {category_id} not found"
        )

    # Delete photo files from disk for all events in category
    for event in category.events:
        for photo in event.photos:
            _delete_photo_files(photo)

    await db.delete(category)


@router.post("/import")
async def import_excel_file(
    file: UploadFile = File(...),
    admin: CurrentAdmin = None,
    db: DbSession = None,
) -> dict:
    """
    Import events from an Excel file.

    Parses the uploaded Excel file and creates/updates categories and events.

    Args:
        file: Uploaded Excel file (.xlsx, .xls).
        admin: Authenticated admin user (from dependency).
        db: Database session.

    Returns:
        Dictionary with imported_events and imported_categories counts.

    Raises:
        HTTPException: 400 if file format is invalid.
    """
    # Validate file extension
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )

    allowed_extensions = {".xlsx", ".xls"}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format. Allowed: {', '.join(allowed_extensions)}"
        )

    try:
        result = await import_excel(file, db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to import Excel file: {str(e)}"
        )


@router.get("/export")
async def export_excel_file(
    admin: CurrentAdmin,
    db: DbSession,
) -> FileResponse:
    """
    Export all events to an Excel file.

    Generates an Excel file with all categories and events.

    Args:
        admin: Authenticated admin user (from dependency).
        db: Database session.

    Returns:
        FileResponse with Excel file download.
    """
    try:
        file_bytes = await export_excel(db)

        # Save to temp file for FileResponse
        temp_path = Path(settings.upload_dir) / "exports"
        temp_path.mkdir(parents=True, exist_ok=True)
        export_file = temp_path / "events_export.xlsx"

        with open(export_file, "wb") as f:
            f.write(file_bytes)

        return FileResponse(
            path=str(export_file),
            filename="events_export.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export Excel file: {str(e)}"
        )


@router.put("/settings/password")
async def change_public_password(
    password_data: PasswordChange,
    admin: CurrentAdmin,
) -> dict:
    """
    Change the public access password.

    Verifies old password before updating to new password.

    Args:
        password_data: Old and new passwords.
        admin: Authenticated admin user (from dependency).

    Returns:
        Success message.

    Raises:
        HTTPException: 400 if old password is incorrect.
        HTTPException: 500 if system is not configured.
    """
    stored_hash = await get_system_setting("public_password")

    if stored_hash is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="System not configured"
        )

    if not verify_password(password_data.old_password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    new_hash = get_password_hash(password_data.new_password)
    await set_system_setting("public_password", new_hash)

    return {"message": "Public password updated successfully"}


@router.put("/settings/admin-password")
async def change_admin_password(
    password_data: PasswordChange,
    admin: CurrentAdmin,
) -> dict:
    """
    Change the admin access password.

    Verifies old password before updating to new password.

    Args:
        password_data: Old and new passwords.
        admin: Authenticated admin user (from dependency).

    Returns:
        Success message.

    Raises:
        HTTPException: 400 if old password is incorrect.
        HTTPException: 500 if system is not configured.
    """
    stored_hash = await get_system_setting("admin_password")

    if stored_hash is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="System not configured"
        )

    if not verify_password(password_data.old_password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    new_hash = get_password_hash(password_data.new_password)
    await set_system_setting("admin_password", new_hash)

    return {"message": "Admin password updated successfully"}


def _delete_photo_files(photo: Photo) -> None:
    """
    Delete photo files (original and thumbnail) from disk.

    Silently ignores if files don't exist.

    Args:
        photo: Photo model instance with file paths.
    """
    for path_attr in ["original_path", "thumbnail_path"]:
        file_path = getattr(photo, path_attr, None)
        if file_path:
            try:
                full_path = Path(settings.upload_dir) / file_path
                if full_path.exists():
                    os.remove(full_path)
            except OSError:
                # Log error but don't fail the deletion
                pass
