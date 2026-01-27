"""Tests for public events API access (no authentication required)."""

import pytest


@pytest.mark.asyncio
async def test_get_events_by_month_no_auth(async_client, test_category, test_event):
    """Test that events can be fetched by month without authentication."""
    response = await async_client.get("/api/events/", params={"month": 1})

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "id" in data[0]
    assert "name" in data[0]
    assert "events" in data[0]


@pytest.mark.asyncio
async def test_get_all_events_no_auth(async_client, test_category, test_event):
    """Test that all events can be fetched without authentication."""
    response = await async_client.get("/api/events/all")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_single_event_no_auth(async_client, test_event):
    """Test that a single event can be fetched without authentication."""
    response = await async_client.get(f"/api/events/{test_event.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_event.id
    assert data["name"] == test_event.name


@pytest.mark.asyncio
async def test_update_event_requires_auth(async_client, test_event):
    """Test that updating event description requires authentication."""
    response = await async_client.patch(
        f"/api/events/{test_event.id}",
        json={"description": "New description"}
    )

    assert response.status_code in [401, 403]
