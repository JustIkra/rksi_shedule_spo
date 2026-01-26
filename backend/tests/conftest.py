"""Pytest configuration and fixtures for backend tests."""

import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone

# Lazy imports to avoid loading app.main when not needed (e.g., for schema-only tests)
# Full app fixtures are only loaded when actually used


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_engine():
    """Create test database engine."""
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.pool import StaticPool
    from app.models.base import Base

    TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine):
    """Create test database session."""
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    async_session = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def async_client(db_session):
    """Create async HTTP client for testing."""
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    from app.api.deps import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
def test_token() -> str:
    """Create a test JWT token."""
    from jose import jwt
    from app.config import get_settings

    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(days=1)
    to_encode = {"sub": "test@example.com", "exp": expire, "is_admin": False}
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


@pytest_asyncio.fixture
async def test_category(db_session):
    """Create a test category."""
    from app.models.category import Category

    category = Category(name="Test Category", month=1, sort_order=0)
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)
    return category


@pytest_asyncio.fixture
async def test_event(db_session, test_category):
    """Create a test event."""
    from app.models.event import Event

    event = Event(
        name="Test Event",
        category_id=test_category.id,
        sort_order=0,
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)
    return event
