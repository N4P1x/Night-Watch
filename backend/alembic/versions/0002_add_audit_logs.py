"""add audit_logs

Revision ID: 0002_add_audit_logs
Revises: 0001_initial_schema
Create Date: 2026-05-08

"""
import sqlalchemy as sa

from alembic import op

revision = "0002_add_audit_logs"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if not inspector.has_table("audit_logs"):
        op.create_table(
            "audit_logs",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("action", sa.String(100), nullable=False, index=True),
            sa.Column("entity_type", sa.String(50), nullable=True),
            sa.Column("entity_id", sa.Integer(), nullable=True),
            sa.Column("details", sa.Text(), nullable=True),
            sa.Column("ip_address", sa.String(45), nullable=True),
            sa.Column("user_agent", sa.String(500), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )


def downgrade() -> None:
    op.drop_table("audit_logs")
