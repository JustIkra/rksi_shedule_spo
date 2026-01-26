"""Tests for event schemas."""

import pytest
from app.schemas.event import EventPublicUpdate, UNSET


def test_event_public_update_unset_by_default():
    """When description is not provided, it should be UNSET."""
    update = EventPublicUpdate()
    assert update.get_description_or_unset() is UNSET


def test_event_public_update_explicit_null():
    """When description is explicitly null, it should be None."""
    update = EventPublicUpdate.model_validate({"description": None})
    assert update.get_description_or_unset() is None


def test_event_public_update_with_value():
    """When description has a value, it should be that value."""
    update = EventPublicUpdate.model_validate({"description": "test"})
    assert update.get_description_or_unset() == "test"


def test_event_public_update_empty_string_becomes_none():
    """When description is empty string, it should become None after strip."""
    update = EventPublicUpdate.model_validate({"description": ""})
    assert update.get_description_or_unset() is None


def test_event_public_update_whitespace_becomes_none():
    """When description is only whitespace, it should become None after strip."""
    update = EventPublicUpdate.model_validate({"description": "   "})
    assert update.get_description_or_unset() is None
