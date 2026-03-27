"""Add wp_post_id column to events table.

Revision ID: 002_add_wp_post_id
Revises: 001_initial
Create Date: 2026-03-27
"""
from alembic import op
import sqlalchemy as sa


revision = "002_add_wp_post_id"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("events", sa.Column("wp_post_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("events", "wp_post_id")
