"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-08
"""

from backend import models  # noqa: F401  Ensures model metadata is registered.
from backend.core.database import Base

from alembic import op

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
