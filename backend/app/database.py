"""
Database connection module for "Portal of SPO Events Plan".

Provides async SQLAlchemy engine, session management, password hashing,
and database initialization with default settings.
"""

from typing import AsyncGenerator
import secrets

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import select
from passlib.context import CryptContext

from .config import get_settings
from .models.base import Base
from .models.settings import Settings

settings = get_settings()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Async engine configuration
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=5,
    max_overflow=10,
)

# Async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injection generator for database sessions.

    Yields an async session and handles commit/rollback automatically.

    Usage:
        @router.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.

    Args:
        plain_password: The plain text password to verify.
        hashed_password: The bcrypt hashed password to compare against.

    Returns:
        True if password matches, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: The plain text password to hash.

    Returns:
        Bcrypt hashed password string.
    """
    return pwd_context.hash(password)


async def init_db() -> None:
    """
    Initialize database with tables and default settings.

    Creates all tables if they don't exist and initializes:
    - public_password: hashed password for public access
    - admin_password: hashed password for admin access
    - admin_url_token: secret token for admin panel URL

    Settings are only created if they don't already exist.
    """
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Initialize default settings
    async with async_session_maker() as session:
        try:
            # Check and create public_password
            result = await session.execute(
                select(Settings).where(Settings.key == "public_password")
            )
            if result.scalar_one_or_none() is None:
                hashed_public = get_password_hash(settings.initial_public_password)
                session.add(Settings(key="public_password", value=hashed_public))

            # Check and create admin_password
            result = await session.execute(
                select(Settings).where(Settings.key == "admin_password")
            )
            if result.scalar_one_or_none() is None:
                hashed_admin = get_password_hash(settings.initial_admin_password)
                session.add(Settings(key="admin_password", value=hashed_admin))

            # Check and create admin_url_token
            result = await session.execute(
                select(Settings).where(Settings.key == "admin_url_token")
            )
            if result.scalar_one_or_none() is None:
                # Use token from settings or generate a secure random one
                token = settings.admin_url_token
                if token == "secret-admin-panel":
                    # Generate secure random token if default is used
                    token = secrets.token_urlsafe(32)
                session.add(Settings(key="admin_url_token", value=token))

            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_system_setting(key: str) -> str | None:
    """
    Get a system setting value by key.

    Args:
        key: The setting key to look up.

    Returns:
        The setting value or None if not found.
    """
    async with async_session_maker() as session:
        result = await session.execute(
            select(Settings).where(Settings.key == key)
        )
        setting = result.scalar_one_or_none()
        return setting.value if setting else None


async def set_system_setting(key: str, value: str) -> None:
    """
    Set a system setting value.

    Creates the setting if it doesn't exist, updates if it does.

    Args:
        key: The setting key.
        value: The setting value.
    """
    async with async_session_maker() as session:
        try:
            result = await session.execute(
                select(Settings).where(Settings.key == key)
            )
            setting = result.scalar_one_or_none()

            if setting:
                setting.value = value
            else:
                session.add(Settings(key=key, value=value))

            await session.commit()
        except Exception:
            await session.rollback()
            raise
