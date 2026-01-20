"""
Main FastAPI application module for "Portal of SPO Events Plan".

This module initializes the FastAPI application with:
- CORS middleware configuration
- Database initialization on startup
- Router mounting for all API endpoints
- Static file serving for uploads
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.rate_limiter import limiter

from app.config import get_settings
from app.database import init_db

# Import routers
from app.api.auth import router as auth_router
from app.api.events import router as events_router
from app.api.photos import router as photos_router
from app.api.links import router as links_router
from app.api.admin import router as admin_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.

    Handles startup and shutdown events:
    - Startup: Initialize database and create uploads directory
    - Shutdown: Cleanup resources if needed
    """
    # Startup
    await init_db()

    # Create uploads directory if it doesn't exist
    uploads_path = Path(settings.upload_dir)
    uploads_path.mkdir(parents=True, exist_ok=True)

    yield

    # Shutdown (cleanup if needed)


app = FastAPI(
    title="Events Portal API",
    version="1.0.0",
    description="API для портала плана мероприятий СПО Ростовской области",
    lifespan=lifespan,
)

# Setup rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware configuration (permissive for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
# Note: Directory must exist before mounting
uploads_path = Path(settings.upload_dir)
if not uploads_path.exists():
    uploads_path.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

# Include routers
# Note: auth_router and admin_router already have their own prefix/tags defined
app.include_router(auth_router, prefix="/api", tags=["auth"])
app.include_router(events_router, prefix="/api/events", tags=["events"])
app.include_router(photos_router, prefix="/api/photos", tags=["photos"])
app.include_router(links_router, prefix="/api/links", tags=["links"])
app.include_router(admin_router, prefix="/api", tags=["admin"])


@app.get("/", tags=["health"])
async def health_check():
    """
    Health check endpoint.

    Returns:
        dict: Status and version information
    """
    return {"status": "ok", "version": "1.0.0"}
