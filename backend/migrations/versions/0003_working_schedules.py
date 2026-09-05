"""working schedules table

Target database: MySQL / MariaDB (see app/core/config.py DATABASE_URL),
SQLite locally. Boolean columns use sa.true()/sa.false() server
defaults, same convention as 0001.

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-05

"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "working_schedules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("is_flexible", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("hours_per_week", sa.Numeric(5, 2), nullable=False),
        sa.Column("days_per_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="Asia/Kolkata"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("working_schedules")
