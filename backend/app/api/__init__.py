"""
API routers package for Events Portal.

This package contains all API endpoint routers:
- auth: Authentication endpoints
- events: Event management endpoints
- links: Link management endpoints
- photos: Photo upload and management endpoints
- admin: Admin panel endpoints
"""

from app.api.auth import router as auth_router
from app.api.events import router as events_router
from app.api.photos import router as photos_router
from app.api.links import router as links_router
from app.api.admin import router as admin_router

__all__ = [
    "auth_router",
    "events_router",
    "photos_router",
    "links_router",
    "admin_router",
]
