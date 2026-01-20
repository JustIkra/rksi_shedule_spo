"""Event model for storing event information."""
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .category import Category
    from .event_link import EventLink
    from .photo import Photo


class Event(Base):
    """
    Event represents a single entry in the events plan.

    Attributes:
        category_id: Reference to parent category (month)
        number: Sequential number in the plan (e.g., "1.1", "2.3")
        name: Event name/title
        event_date: Date or date range as text (e.g., "15-20 января")
        responsible: Responsible persons/departments
        location: Event venue
        description: Additional editable description
        sort_order: Order within category
    """

    __tablename__ = "events"

    category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    number: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    event_date: Mapped[str] = mapped_column(String(100), nullable=False)
    responsible: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    category: Mapped["Category"] = relationship(
        "Category",
        back_populates="events",
        lazy="joined",
    )
    links: Mapped[List["EventLink"]] = relationship(
        "EventLink",
        back_populates="event",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    photos: Mapped[List["Photo"]] = relationship(
        "Photo",
        back_populates="event",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Event(id={self.id}, number={self.number!r}, name={self.name[:30]!r}...)>"
