# Fix Empty Description Save Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to clear the description field (set it to empty/null) and have that change persist after page refresh.

**Architecture:** The fix requires changes on both frontend and backend:
1. Frontend: Fix comparison logic to properly detect when description changes from text to empty
2. Backend: Use sentinel value pattern to distinguish "field not provided" from "field explicitly set to null"

**Tech Stack:** React/TypeScript (frontend), FastAPI/Pydantic (backend), SQLAlchemy (ORM)

---

## Root Cause Analysis

### Problem 1: Frontend comparison bug (DescriptionEditorModal.tsx:78)

```javascript
// Current (BROKEN):
if (trimmedText === originalValue.current) {  // "" === "" when clearing non-null value
  onClose();
  return;
}
```

When user clears description:
- `initialValue = "some text"` → `originalValue.current = "some text"`
- User deletes all text → `text = ""`
- `trimmedText = ""`, `newValue = null`
- Comparison: `"" === "some text"` → FALSE → Proceeds to save ✓

This case actually works! The bug is elsewhere.

### Problem 2: Backend silently ignores null (events.py:214)

```python
# Current (BROKEN):
if event_update.description is not None:  # null from JSON → None in Python
    event.description = event_update.description
```

When frontend sends `{"description": null}`:
- Pydantic parses JSON `null` as Python `None`
- Condition `is not None` is **False** → assignment is **SKIPPED**
- Description remains unchanged in database!

### Problem 3: Pydantic schema ambiguity (event.py:44)

```python
class EventPublicUpdate(BaseModel):
    description: str | None = None  # Can't distinguish "not provided" from "explicitly null"
```

The schema can't tell the difference between:
- `{}` (field not provided) → description = None (default)
- `{"description": null}` (explicitly clearing) → description = None (from JSON)

---

## Solution Design

### Approach: Use sentinel value with `UNSET` pattern

This is a standard Pydantic pattern for distinguishing "not provided" from "explicitly null".

```python
from pydantic import Field
from typing import Annotated

class _Unset:
    """Sentinel value for fields that were not provided in the request."""
    pass

UNSET = _Unset()

class EventPublicUpdate(BaseModel):
    description: str | None | _Unset = UNSET
```

Now:
- `{}` → description = UNSET (not provided)
- `{"description": null}` → description = None (explicitly clearing)
- `{"description": "text"}` → description = "text" (setting value)

---

## Tasks

### Task 1: Add UNSET sentinel to schemas

**Files:**
- Modify: `backend/app/schemas/event.py:41-44`

**Step 1: Write the failing test**

Create file: `backend/tests/test_event_schema.py`

```python
"""Tests for event schemas."""

import pytest
from app.schemas.event import EventPublicUpdate, UNSET


def test_event_public_update_unset_by_default():
    """When description is not provided, it should be UNSET."""
    update = EventPublicUpdate()
    assert update.description is UNSET


def test_event_public_update_explicit_null():
    """When description is explicitly null, it should be None."""
    update = EventPublicUpdate.model_validate({"description": None})
    assert update.description is None


def test_event_public_update_with_value():
    """When description has a value, it should be that value."""
    update = EventPublicUpdate.model_validate({"description": "test"})
    assert update.description == "test"


def test_event_public_update_empty_string_becomes_none():
    """When description is empty string, it should become None after strip."""
    update = EventPublicUpdate.model_validate({"description": ""})
    assert update.description is None


def test_event_public_update_whitespace_becomes_none():
    """When description is only whitespace, it should become None after strip."""
    update = EventPublicUpdate.model_validate({"description": "   "})
    assert update.description is None
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_event_schema.py -v`
Expected: FAIL - UNSET not defined, tests fail

**Step 3: Implement UNSET sentinel and update EventPublicUpdate**

Modify `backend/app/schemas/event.py`:

```python
"""Event schemas."""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, field_validator


class _Unset:
    """Sentinel value for fields that were not provided in the request."""
    pass


UNSET = _Unset()


class EventBase(BaseModel):
    """Base schema for event."""

    number: str | None = None
    name: str
    event_date: str | None = None
    responsible: str | None = None
    location: str | None = None
    description: str | None = None
    sort_order: int = 0


class EventCreate(EventBase):
    """Schema for creating an event."""

    category_id: int


class EventUpdate(BaseModel):
    """Schema for updating an event (admin)."""

    number: str | None = None
    name: str | None = None
    event_date: str | None = None
    responsible: str | None = None
    location: str | None = None
    description: str | None = None
    sort_order: int | None = None
    category_id: int | None = None


class EventPublicUpdate(BaseModel):
    """Schema for updating an event (public user) - only description."""

    description: str | None | _Unset = UNSET

    @field_validator("description", mode="before")
    @classmethod
    def normalize_description(cls, v):
        """Normalize description: strip whitespace, convert empty to None."""
        if v is UNSET:
            return UNSET
        if v is None:
            return None
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v


class EventResponse(BaseModel):
    """Schema for event response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str | None = None
    name: str
    event_date: str | None = None
    responsible: str | None = None
    location: str | None = None
    description: str | None = None
    sort_order: int
    category_id: int
    created_at: datetime
    updated_at: datetime


class EventWithRelations(EventResponse):
    """Schema for event response with related links and photos."""

    links: list["LinkResponse"] = []
    photos: list["PhotoResponse"] = []


# Import at end to avoid circular imports
from .link import LinkResponse
from .photo import PhotoResponse

EventWithRelations.model_rebuild()
```

**Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_event_schema.py -v`
Expected: PASS - all 5 tests pass

**Step 5: Commit**

```bash
git add backend/app/schemas/event.py backend/tests/test_event_schema.py
git commit -m "$(cat <<'EOF'
feat(schema): add UNSET sentinel for EventPublicUpdate

Allows distinguishing between "field not provided" and "field
explicitly set to null" when updating event description.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Update backend API to handle UNSET

**Files:**
- Modify: `backend/app/api/events.py:213-215`
- Test: `backend/tests/test_events_api.py` (create if not exists)

**Step 1: Write the failing test**

Create/update file: `backend/tests/test_events_api.py`

```python
"""Tests for events API endpoints."""

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.event import Event


@pytest.fixture
def auth_headers(test_token: str) -> dict:
    """Return auth headers with test token."""
    return {"Authorization": f"Bearer {test_token}"}


@pytest.mark.asyncio
async def test_update_description_to_null(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_event: Event,
    auth_headers: dict,
):
    """Explicitly setting description to null should clear it."""
    # Setup: event has a description
    test_event.description = "Initial description"
    await db_session.commit()
    await db_session.refresh(test_event)

    # Act: send explicit null
    response = await async_client.patch(
        f"/api/events/{test_event.id}",
        json={"description": None},
        headers=auth_headers,
    )

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["description"] is None

    # Verify in database
    await db_session.refresh(test_event)
    assert test_event.description is None


@pytest.mark.asyncio
async def test_update_description_not_provided(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_event: Event,
    auth_headers: dict,
):
    """Not providing description should leave it unchanged."""
    # Setup: event has a description
    test_event.description = "Initial description"
    await db_session.commit()
    await db_session.refresh(test_event)

    # Act: send empty object (description not provided)
    response = await async_client.patch(
        f"/api/events/{test_event.id}",
        json={},
        headers=auth_headers,
    )

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Initial description"

    # Verify in database
    await db_session.refresh(test_event)
    assert test_event.description == "Initial description"


@pytest.mark.asyncio
async def test_update_description_with_value(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_event: Event,
    auth_headers: dict,
):
    """Providing description value should update it."""
    # Setup: event has no description
    test_event.description = None
    await db_session.commit()

    # Act: send new description
    response = await async_client.patch(
        f"/api/events/{test_event.id}",
        json={"description": "New description"},
        headers=auth_headers,
    )

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "New description"

    # Verify in database
    await db_session.refresh(test_event)
    assert test_event.description == "New description"
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_events_api.py::test_update_description_to_null -v`
Expected: FAIL - description remains unchanged when null is sent

**Step 3: Update events.py to handle UNSET**

Modify `backend/app/api/events.py`:

Change the import section to include UNSET:

```python
from app.schemas.event import EventPublicUpdate, EventResponse, EventWithRelations, UNSET
```

Change lines 213-215 from:

```python
    # Update only description field
    if event_update.description is not None:
        event.description = event_update.description
```

To:

```python
    # Update only description field (UNSET means "not provided", None means "clear it")
    if event_update.description is not UNSET:
        event.description = event_update.description
```

**Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_events_api.py -v`
Expected: PASS - all 3 tests pass

**Step 5: Commit**

```bash
git add backend/app/api/events.py backend/tests/test_events_api.py
git commit -m "$(cat <<'EOF'
fix(api): allow clearing event description by sending null

Changed condition from `is not None` to `is not UNSET` so that
explicitly sending `{"description": null}` now clears the field.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Fix frontend comparison logic (defensive)

**Files:**
- Modify: `frontend/src/components/DescriptionEditorModal.tsx:78,88,124`

**Step 1: Analyze the current state**

The current frontend comparison actually works correctly for the clearing case:
- `originalValue.current = "some text"` (from initialValue)
- User clears → `trimmedText = ""`
- `"" !== "some text"` → proceeds to save

However, there's a subtle issue with `originalValue.current` update after save:

```javascript
originalValue.current = trimmedText;  // Sets to "" instead of null
```

This means if user saves empty, then tries to save empty again, it compares `"" === ""` and skips.
While the backend fix is sufficient, let's make the frontend consistent.

**Step 2: Update DescriptionEditorModal for consistency**

The frontend code is defensive-correct. The main fix is backend.
However, for consistency, update line 88 to store the actual saved value:

Change line 88 from:
```javascript
originalValue.current = trimmedText;
```

To:
```javascript
originalValue.current = newValue === null ? '' : newValue;
```

Actually, this is equivalent. The current code is fine.

**Step 3: Verify frontend sends null correctly**

Check `frontend/src/api/events.ts` to ensure null is sent correctly.

**Step 4: No changes needed**

After review, the frontend code is correct. The issue is entirely backend.

**Step 5: Skip commit (no changes)**

No frontend changes needed.

---

### Task 4: Run full test suite

**Step 1: Run all backend tests**

Run: `cd backend && python -m pytest -v`
Expected: All tests pass

**Step 2: Run frontend tests (if any)**

Run: `cd frontend && npm test` (or `npm run test:unit`)
Expected: All tests pass (or skip if no tests configured)

**Step 3: Manual verification**

1. Start backend: `cd backend && uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Open app in browser
4. Find an event with description text
5. Click to edit description
6. Delete all text
7. Click Save
8. Refresh page
9. Verify description is empty (not restored)

**Step 4: Commit if any fixes needed**

If tests reveal issues, fix and commit.

---

### Task 5: Create tests directory structure (if missing)

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`

**Step 1: Check if tests directory exists**

Run: `ls -la backend/tests/`

**Step 2: Create conftest.py if needed**

If `conftest.py` doesn't exist, create it with fixtures:

```python
"""Pytest configuration and fixtures for backend tests."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.event import Event
from app.models.category import Category
from app.core.security import create_access_token


# Test database URL (in-memory SQLite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


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
    async_session = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def async_client(db_session: AsyncSession):
    """Create async HTTP client for testing."""
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
    return create_access_token(data={"sub": "test@example.com"})


@pytest_asyncio.fixture
async def test_category(db_session: AsyncSession) -> Category:
    """Create a test category."""
    category = Category(name="Test Category", month=1, sort_order=0)
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)
    return category


@pytest_asyncio.fixture
async def test_event(db_session: AsyncSession, test_category: Category) -> Event:
    """Create a test event."""
    event = Event(
        name="Test Event",
        category_id=test_category.id,
        sort_order=0,
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)
    return event
```

**Step 3: Create __init__.py**

```python
"""Backend tests package."""
```

**Step 4: Commit if created**

```bash
git add backend/tests/
git commit -m "$(cat <<'EOF'
test: add test infrastructure with fixtures

Adds conftest.py with async fixtures for database, HTTP client,
and test data. Uses in-memory SQLite for fast tests.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Summary

The root cause is **backend line 214** checking `is not None` instead of `is not UNSET`.

| Task | Files Modified | Purpose |
|------|---------------|---------|
| 1 | `schemas/event.py` | Add UNSET sentinel pattern |
| 2 | `api/events.py` | Use UNSET check instead of None check |
| 3 | - | Frontend is correct, no changes needed |
| 4 | - | Run full test suite |
| 5 | `tests/conftest.py` | Add test infrastructure if missing |

After these changes:
- `{}` → description unchanged (UNSET)
- `{"description": null}` → description cleared (None)
- `{"description": "text"}` → description updated
