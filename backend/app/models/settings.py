"""Settings model for storing application configuration."""
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Settings(Base):
    """
    Application settings stored in database.

    Keys:
        - public_password: Password for public access
        - admin_password: Password for admin access
        - admin_url_token: Secret token in admin URL
    """

    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    value: Mapped[str] = mapped_column(Text, nullable=False)

    def __repr__(self) -> str:
        return f"<Settings(key={self.key!r})>"
