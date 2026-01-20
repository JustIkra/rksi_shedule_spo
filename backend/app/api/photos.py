"""
Photo management API endpoints for Events Portal.

Provides endpoints for:
- Listing photos for an event
- Uploading photos (multiple files)
- Deleting photos
- Downloading original photos
- Downloading all photos as ZIP
"""

import io
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.database import get_db
from app.models.event import Event
from app.models.photo import Photo
from app.schemas.photo import PhotoResponse, PhotoUploadResponse
from app.services.image_processor import ImageProcessor, get_image_processor

settings = get_settings()

router = APIRouter()


# Dependency for authorization (stub - to be implemented with JWT)
async def require_auth() -> bool:
    """
    Dependency to require authentication.

    TODO: Implement JWT token validation.
    For now, returns True to allow access.
    """
    # In production, this should:
    # 1. Extract JWT from Authorization header
    # 2. Validate token
    # 3. Return user info or raise HTTPException(401)
    return True


@router.get(
    "/events/{event_id}/photos",
    response_model=list[PhotoResponse],
    summary="Get photos for event",
    description="Returns all photos for a specific event, sorted by creation date (newest first).",
)
async def get_event_photos(
    event_id: int,
    db: AsyncSession = Depends(get_db),
) -> list[PhotoResponse]:
    """
    Get all photos for a specific event.

    Args:
        event_id: ID of the event.
        db: Database session.

    Returns:
        List of photos sorted by created_at DESC.

    Raises:
        HTTPException 404: If event not found.
    """
    # Check if event exists
    event_result = await db.execute(
        select(Event).where(Event.id == event_id)
    )
    event = event_result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found",
        )

    # Get photos sorted by created_at DESC
    result = await db.execute(
        select(Photo)
        .where(Photo.event_id == event_id)
        .order_by(Photo.created_at.desc())
    )
    photos = result.scalars().all()

    return [PhotoResponse.model_validate(photo) for photo in photos]


@router.post(
    "/events/{event_id}/photos",
    response_model=PhotoUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload photos to event",
    description="Upload multiple photos to an event. Only JPEG and PNG files are allowed.",
)
async def upload_photos(
    event_id: int,
    files: Annotated[list[UploadFile], File(description="Photos to upload (JPEG/PNG)")],
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(require_auth),
    image_processor: ImageProcessor = Depends(get_image_processor),
) -> PhotoUploadResponse:
    """
    Upload multiple photos to an event.

    Args:
        event_id: ID of the event.
        files: List of files to upload.
        db: Database session.
        image_processor: Image processing service.

    Returns:
        PhotoUploadResponse with uploaded photos and any errors.

    Raises:
        HTTPException 404: If event not found.
        HTTPException 400: If no files provided.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided",
        )

    # Check if event exists and get its month
    event_result = await db.execute(
        select(Event)
        .options(selectinload(Event.category))
        .where(Event.id == event_id)
    )
    event = event_result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found",
        )

    # Get month from category
    month = event.category.month if event.category else datetime.now().month

    uploaded_photos: list[PhotoResponse] = []
    errors: list[str] = []

    for file in files:
        try:
            # Process and save image (validation is done inside process_image)
            original_path, thumbnail_path, file_size = await image_processor.process_image(
                file, event_id, month
            )

            # Create database record
            photo = Photo(
                event_id=event_id,
                filename=file.filename or "unnamed",
                original_path=original_path,
                thumbnail_path=thumbnail_path,
                file_size=file_size,
            )
            db.add(photo)
            await db.flush()
            await db.refresh(photo)

            uploaded_photos.append(PhotoResponse.model_validate(photo))

        except HTTPException as e:
            errors.append(f"File '{file.filename}': {e.detail}")
        except Exception as e:
            errors.append(f"Unexpected error for '{file.filename}': {str(e)}")

    return PhotoUploadResponse(photos=uploaded_photos, errors=errors)


@router.delete(
    "/{photo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete photo",
    description="Delete a photo and its files from disk.",
)
async def delete_photo(
    photo_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(require_auth),
    image_processor: ImageProcessor = Depends(get_image_processor),
) -> None:
    """
    Delete a photo.

    Removes the database record and deletes files from disk.

    Args:
        photo_id: ID of the photo to delete.
        db: Database session.
        image_processor: Image processing service.

    Raises:
        HTTPException 404: If photo not found.
    """
    # Get photo
    result = await db.execute(
        select(Photo).where(Photo.id == photo_id)
    )
    photo = result.scalar_one_or_none()

    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Photo with id {photo_id} not found",
        )

    # Delete files from disk
    try:
        await image_processor.delete_image_files(photo.original_path, photo.thumbnail_path)
    except Exception:
        # Log error but continue with DB deletion
        pass

    # Delete from database
    await db.delete(photo)


@router.get(
    "/{photo_id}/original",
    summary="Download original photo",
    description="Download the original full-size photo as an attachment.",
)
async def download_original(
    photo_id: int,
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    """
    Download original photo.

    Args:
        photo_id: ID of the photo.
        db: Database session.

    Returns:
        FileResponse with the original image.

    Raises:
        HTTPException 404: If photo or file not found.
    """
    # Get photo
    result = await db.execute(
        select(Photo).where(Photo.id == photo_id)
    )
    photo = result.scalar_one_or_none()

    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Photo with id {photo_id} not found",
        )

    # Build full path
    file_path = Path(settings.upload_dir) / photo.original_path

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo file not found on disk",
        )

    # Determine media type
    ext = file_path.suffix.lower()
    media_type = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"

    return FileResponse(
        path=str(file_path),
        filename=photo.filename,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename=\"{photo.filename}\""},
    )


@router.get(
    "/events/{event_id}/zip",
    summary="Download all photos as ZIP",
    description="Download all photos from an event as a ZIP archive.",
)
async def download_photos_zip(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(require_auth),
) -> StreamingResponse:
    """
    Download all photos for an event as a ZIP archive.

    Args:
        event_id: ID of the event.
        db: Database session.

    Returns:
        StreamingResponse with ZIP archive.

    Raises:
        HTTPException 404: If event not found or has no photos.
    """
    # Check if event exists
    event_result = await db.execute(
        select(Event).where(Event.id == event_id)
    )
    event = event_result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found",
        )

    # Get all photos
    result = await db.execute(
        select(Photo)
        .where(Photo.event_id == event_id)
        .order_by(Photo.created_at.desc())
    )
    photos = result.scalars().all()

    if not photos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No photos found for this event",
        )

    # Create ZIP in memory
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for photo in photos:
            file_path = Path(settings.upload_dir) / photo.original_path

            if file_path.exists():
                # Use original filename in ZIP
                arcname = photo.filename
                # Handle duplicate filenames by adding ID
                existing_names = [info.filename for info in zip_file.filelist]
                if arcname in existing_names:
                    name_parts = Path(arcname)
                    arcname = f"{name_parts.stem}_{photo.id}{name_parts.suffix}"

                zip_file.write(file_path, arcname)

    zip_buffer.seek(0)

    # Generate filename for ZIP with proper encoding for non-ASCII characters
    from urllib.parse import quote

    safe_event_name = "".join(c if c.isalnum() or c in " -_" else "_" for c in event.name[:50])
    zip_filename = f"photos_{safe_event_name}_{event_id}.zip"

    # Use RFC 5987 encoding for non-ASCII filenames
    ascii_filename = f"photos_event_{event_id}.zip"
    encoded_filename = quote(zip_filename)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=\"{ascii_filename}\"; filename*=UTF-8''{encoded_filename}",
        },
    )
