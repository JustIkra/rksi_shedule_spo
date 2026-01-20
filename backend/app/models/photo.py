"""Photo model for storing event photos."""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .event import Event


class Photo(Base):
    """
    Photo stores information about uploaded event photos.

    Attributes:
        event_id: Reference to parent event
        filename: Original filename
        original_path: Path to original image file
        thumbnail_path: Path to thumbnail image
        file_size: File size in bytes
    """

    __tablename__ = "photos"

    event_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_path: Mapped[str] = mapped_column(Text, nullable=False)
    thumbnail_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    event: Mapped["Event"] = relationship(
        "Event",
        back_populates="photos",
        lazy="joined",
    )

    def __repr__(self) -> str:
        return f"<Photo(id={self.id}, event_id={self.event_id}, filename={self.filename!r})>"
