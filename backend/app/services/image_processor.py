"""
Image processing service for the Events Portal SPO.

Provides functionality for:
- Validating image formats (JPEG/PNG only)
- Reading and applying EXIF orientation
- Saving original images with auto-rotation
- Creating optimized thumbnails
- Managing upload directory structure
"""

import uuid
from io import BytesIO
from pathlib import Path

import aiofiles
from fastapi import UploadFile, HTTPException
from PIL import Image, ExifTags

from app.config import get_settings

settings = get_settings()

# Allowed image formats
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png"}

# Find EXIF orientation tag
ORIENTATION_TAG: int | None = None
for tag, name in ExifTags.TAGS.items():
    if name == "Orientation":
        ORIENTATION_TAG = tag
        break


def get_exif_orientation(image: Image.Image) -> int:
    """
    Read EXIF orientation from image.

    Args:
        image: PIL Image object

    Returns:
        Orientation value (1-8), defaults to 1 (normal) if not found

    EXIF orientation values:
        1: Normal (0 degrees)
        2: Mirrored horizontally
        3: Rotated 180 degrees
        4: Mirrored vertically
        5: Mirrored horizontally, then rotated 90 CCW
        6: Rotated 90 CW (clockwise)
        7: Mirrored horizontally, then rotated 90 CW
        8: Rotated 90 CCW (counter-clockwise)
    """
    if ORIENTATION_TAG is None:
        return 1

    try:
        exif = image.getexif()
        if exif is None:
            return 1
        return exif.get(ORIENTATION_TAG, 1)
    except (AttributeError, KeyError, IndexError, TypeError):
        return 1


def apply_exif_orientation(image: Image.Image, orientation: int) -> Image.Image:
    """
    Apply rotation/flip according to EXIF orientation.

    Args:
        image: PIL Image object
        orientation: EXIF orientation value (1-8)

    Returns:
        Transformed PIL Image object
    """
    if orientation == 1:
        # Normal - no transformation needed
        return image
    elif orientation == 2:
        # Mirrored horizontally
        return image.transpose(Image.FLIP_LEFT_RIGHT)
    elif orientation == 3:
        # Rotated 180 degrees
        return image.rotate(180, expand=True)
    elif orientation == 4:
        # Mirrored vertically
        return image.transpose(Image.FLIP_TOP_BOTTOM)
    elif orientation == 5:
        # Mirrored horizontally, then rotated 90 CCW
        return image.transpose(Image.FLIP_LEFT_RIGHT).rotate(90, expand=True)
    elif orientation == 6:
        # Rotated 90 CW (clockwise)
        return image.rotate(-90, expand=True)
    elif orientation == 7:
        # Mirrored horizontally, then rotated 90 CW
        return image.transpose(Image.FLIP_LEFT_RIGHT).rotate(-90, expand=True)
    elif orientation == 8:
        # Rotated 90 CCW (counter-clockwise)
        return image.rotate(90, expand=True)
    else:
        # Unknown orientation, return as is
        return image


class ImageProcessor:
    """
    Service for processing and storing uploaded images.

    Handles file storage with the following directory structure:
    /uploads/{year}/{month}/{event_id}/original/
    /uploads/{year}/{month}/{event_id}/thumbnails/

    Features:
    - Format validation (JPEG/PNG only)
    - EXIF orientation detection and auto-rotation
    - Thumbnail generation with configurable size and quality
    - EXIF data removal from saved images (privacy)
    """

    ALLOWED_CONTENT_TYPES = ALLOWED_MIME_TYPES
    ALLOWED_EXTENSIONS = ALLOWED_EXTENSIONS

    def __init__(self, upload_dir: str | None = None):
        """
        Initialize ImageProcessor.

        Args:
            upload_dir: Base directory for uploads. Defaults to settings.upload_dir.
        """
        self.upload_dir = Path(upload_dir or settings.upload_dir)
        self.thumbnail_size = settings.thumbnail_size
        self.thumbnail_quality = settings.thumbnail_quality
        self.max_upload_size_mb = settings.max_upload_size_mb

    def _validate_format(self, file: UploadFile) -> str:
        """
        Validate image format by extension and MIME type.

        Args:
            file: FastAPI UploadFile object

        Returns:
            File extension (lowercase, with dot)

        Raises:
            HTTPException: If format is not allowed
        """
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="Filename is required"
            )

        extension = Path(file.filename).suffix.lower()
        if extension not in self.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file format '{extension}'. Allowed formats: JPEG, PNG"
            )

        if file.content_type and file.content_type not in self.ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid MIME type '{file.content_type}'. Allowed types: image/jpeg, image/png"
            )

        return extension

    def _generate_filename(self, extension: str) -> str:
        """
        Generate unique filename using UUID.

        Args:
            extension: File extension (with dot)

        Returns:
            Unique filename
        """
        return f"{uuid.uuid4().hex}{extension}"

    def _create_directories(self, event_id: int, month: int) -> tuple[Path, Path]:
        """
        Create directories for original and thumbnail images.

        Args:
            event_id: Event ID
            month: Month number (1-12)

        Returns:
            Tuple of (original_dir, thumbnail_dir)
        """
        from datetime import datetime
        year = datetime.now().year
        month_str = f"{month:02d}"

        original_dir = self.upload_dir / str(year) / month_str / str(event_id) / "original"
        thumbnail_dir = self.upload_dir / str(year) / month_str / str(event_id) / "thumbnails"

        original_dir.mkdir(parents=True, exist_ok=True)
        thumbnail_dir.mkdir(parents=True, exist_ok=True)

        return original_dir, thumbnail_dir

    def _convert_to_rgb(self, image: Image.Image) -> Image.Image:
        """
        Convert image to RGB mode if necessary.

        Handles RGBA and P (palette) modes by compositing onto white background.

        Args:
            image: PIL Image object

        Returns:
            RGB mode PIL Image object
        """
        if image.mode == "RGB":
            return image

        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            # Create white background for transparent images
            if image.mode == "P":
                image = image.convert("RGBA")

            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "RGBA":
                background.paste(image, mask=image.split()[3])
            elif image.mode == "LA":
                background.paste(image, mask=image.split()[1])
            return background

        return image.convert("RGB")

    def _process_image_content(
        self,
        content: bytes,
        original_path: Path,
        thumbnail_path: Path
    ) -> int:
        """
        Process image: apply EXIF orientation, save original and create thumbnail.

        Args:
            content: Raw image bytes
            original_path: Path to save original image
            thumbnail_path: Path to save thumbnail

        Returns:
            Original file size in bytes
        """
        # Open image from bytes
        image = Image.open(BytesIO(content))

        # Get and apply EXIF orientation
        orientation = get_exif_orientation(image)
        image = apply_exif_orientation(image, orientation)

        # Convert to RGB
        image = self._convert_to_rgb(image)

        # Save original (without EXIF data for privacy)
        image.save(original_path, "JPEG", quality=95, optimize=True)

        # Create thumbnail
        thumbnail = image.copy()
        thumbnail.thumbnail(self.thumbnail_size, Image.LANCZOS)
        thumbnail.save(thumbnail_path, "JPEG", quality=self.thumbnail_quality, optimize=True)

        return len(content)

    async def process_image(
        self,
        file: UploadFile,
        event_id: int,
        month: int
    ) -> tuple[str, str, int]:
        """
        Process uploaded image: validate, save original, create thumbnail.

        Args:
            file: FastAPI UploadFile object
            event_id: Event ID for directory structure
            month: Month number (1-12) for directory structure

        Returns:
            Tuple of (original_path, thumbnail_path, file_size)
            Paths are relative to upload_dir.

        Raises:
            HTTPException: If image validation fails or processing error occurs
        """
        # Validate format
        extension = self._validate_format(file)

        # Generate unique filename
        filename = self._generate_filename(extension)

        # Create directories
        original_dir, thumbnail_dir = self._create_directories(event_id, month)

        # Build file paths
        original_path = original_dir / filename
        thumbnail_path = thumbnail_dir / filename

        try:
            # Read file content
            content = await file.read()

            # Check file size
            max_size = self.max_upload_size_mb * 1024 * 1024
            if len(content) > max_size:
                raise HTTPException(
                    status_code=400,
                    detail=f"File too large. Maximum size: {self.max_upload_size_mb}MB"
                )

            # Process and save images (CPU-bound, runs synchronously)
            file_size = self._process_image_content(
                content=content,
                original_path=original_path,
                thumbnail_path=thumbnail_path
            )

            # Return relative paths from upload_dir
            relative_original = str(original_path.relative_to(self.upload_dir))
            relative_thumbnail = str(thumbnail_path.relative_to(self.upload_dir))

            return relative_original, relative_thumbnail, file_size

        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            # Clean up on error
            if original_path.exists():
                original_path.unlink()
            if thumbnail_path.exists():
                thumbnail_path.unlink()

            raise HTTPException(
                status_code=500,
                detail=f"Failed to process image: {str(e)}"
            )

    async def delete_image_files(self, original_path: str, thumbnail_path: str) -> None:
        """
        Delete original and thumbnail image files.

        Silently ignores errors if files don't exist.

        Args:
            original_path: Relative path to original image (from upload_dir)
            thumbnail_path: Relative path to thumbnail (from upload_dir)
        """
        # Delete original
        original_full_path = self.upload_dir / original_path
        try:
            if original_full_path.exists():
                original_full_path.unlink()
        except OSError:
            pass

        # Delete thumbnail
        thumbnail_full_path = self.upload_dir / thumbnail_path
        try:
            if thumbnail_full_path.exists():
                thumbnail_full_path.unlink()
        except OSError:
            pass


# Module-level functions for convenience

async def process_image(
    file: UploadFile,
    event_id: int,
    month: int
) -> tuple[str, str, int]:
    """
    Process uploaded image: validate, save original, create thumbnail.

    Convenience function that uses default ImageProcessor instance.

    Args:
        file: FastAPI UploadFile object
        event_id: Event ID for directory structure
        month: Month number (1-12) for directory structure

    Returns:
        Tuple of (original_path, thumbnail_path, file_size)

    Raises:
        HTTPException: If image validation fails or processing error occurs
    """
    processor = ImageProcessor()
    return await processor.process_image(file, event_id, month)


async def delete_image_files(original_path: str, thumbnail_path: str) -> None:
    """
    Delete original and thumbnail image files.

    Convenience function that uses default ImageProcessor instance.

    Args:
        original_path: Relative path to original image (from upload_dir)
        thumbnail_path: Relative path to thumbnail (from upload_dir)
    """
    processor = ImageProcessor()
    await processor.delete_image_files(original_path, thumbnail_path)


# Global instance for dependency injection
image_processor = ImageProcessor()


def get_image_processor() -> ImageProcessor:
    """Dependency injection for ImageProcessor."""
    return image_processor
