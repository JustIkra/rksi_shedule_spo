"""Initial database schema.

Revision ID: 001_initial
Revises:
Create Date: 2026-01-20

Creates all tables for Events Portal:
- settings: Application configuration (passwords, tokens)
- categories: Month sections for events
- events: Event entries with all fields
- event_links: Links attached to events
- photos: Photo records for events
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Settings table
    op.create_table(
        "settings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("key", sa.String(50), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_settings_key", "settings", ["key"], unique=True)

    # Categories table
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("month >= 1 AND month <= 12", name="check_month_range"),
    )

    # Events table
    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("number", sa.String(20), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("event_date", sa.String(100), nullable=False),
        sa.Column("responsible", sa.Text(), nullable=True),
        sa.Column("location", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            name="fk_events_category_id",
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_events_category_id", "events", ["category_id"])

    # Event Links table
    op.create_table(
        "event_links",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["event_id"],
            ["events.id"],
            name="fk_event_links_event_id",
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_event_links_event_id", "event_links", ["event_id"])

    # Photos table
    op.create_table(
        "photos",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("original_path", sa.Text(), nullable=False),
        sa.Column("thumbnail_path", sa.Text(), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["event_id"],
            ["events.id"],
            name="fk_photos_event_id",
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_photos_event_id", "photos", ["event_id"])


def downgrade() -> None:
    op.drop_table("photos")
    op.drop_table("event_links")
    op.drop_table("events")
    op.drop_table("categories")
    op.drop_table("settings")
