"""Category model for event grouping by months."""
from typing import TYPE_CHECKING, List

from sqlalchemy import CheckConstraint, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .event import Event


class Category(Base):
    """
    Category represents a month section in the events plan.

    Attributes:
        name: Category display name (e.g., "Январь 2025")
        month: Month number (1-12)
        sort_order: Order for display
    """

    __tablename__ = "categories"
    __table_args__ = (
        CheckConstraint("month >= 1 AND month <= 12", name="check_month_range"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    events: Mapped[List["Event"]] = relationship(
        "Event",
        back_populates="category",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Category(id={self.id}, name={self.name!r}, month={self.month})>"
