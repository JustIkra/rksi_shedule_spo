"""EventLink model for storing links attached to events."""
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .event import Event


class EventLink(Base):
    """
    EventLink stores external links associated with an event.

    Attributes:
        event_id: Reference to parent event
        url: Full URL of the link
        title: Optional display title for the link
    """

    __tablename__ = "event_links"

    event_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    event: Mapped["Event"] = relationship(
        "Event",
        back_populates="links",
        lazy="joined",
    )

    def __repr__(self) -> str:
        return f"<EventLink(id={self.id}, event_id={self.event_id}, url={self.url[:50]!r}...)>"
