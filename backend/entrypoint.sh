#!/bin/sh
set -e

echo "[entrypoint] Checking database migration state..."

# Detect DB state and stamp alembic if needed (for DBs created before alembic tracking)
python << 'PYEOF'
import asyncio
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import get_settings
import subprocess, sys

async def main():
    settings = get_settings()
    engine = create_async_engine(settings.database_url)

    async with engine.connect() as conn:
        has_alembic = await conn.run_sync(lambda c: inspect(c).has_table("alembic_version"))
        has_events = await conn.run_sync(lambda c: inspect(c).has_table("events"))

        if has_events and not has_alembic:
            # DB exists but was created without alembic — detect schema version
            result = await conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='events' AND column_name='wp_post_id'"
            ))
            has_wp = result.first() is not None

            stamp = "002_add_wp_post_id" if has_wp else "001_initial"
            print(f"[entrypoint] DB has tables but no alembic tracking. Stamping to {stamp}")
            subprocess.run(["alembic", "stamp", stamp], check=True)
        elif not has_events:
            print("[entrypoint] Fresh database, migrations will create tables")
        else:
            print("[entrypoint] Alembic tracking already in place")

    await engine.dispose()

asyncio.run(main())
PYEOF

echo "[entrypoint] Running alembic upgrade head..."
alembic upgrade head

echo "[entrypoint] Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
