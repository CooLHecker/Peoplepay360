"""time off types, allocations, requests

Target database: MySQL / MariaDB (see app/core/config.py DATABASE_URL),
SQLite locally. Boolean columns use sa.true()/sa.false() server
defaults, same convention as 0001/0003.

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-05

"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "time_off_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("requires_allocation", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "work_entry_behavior",
            sa.Enum("paid", "unpaid", name="time_off_work_entry_behavior"),
            nullable=False,
            server_default="paid",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )

    op.create_table(
        "time_off_allocations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "employee_id",
            sa.Integer(),
            sa.ForeignKey("employees.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "time_off_type_id",
            sa.Integer(),
            sa.ForeignKey("time_off_types.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("allocated_days", sa.Numeric(6, 2), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("draft", "submitted", "approved", "refused", name="time_off_allocation_status"),
            nullable=False,
            server_default="submitted",
        ),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )

    op.create_table(
        "time_off_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "employee_id",
            sa.Integer(),
            sa.ForeignKey("employees.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "time_off_type_id",
            sa.Integer(),
            sa.ForeignKey("time_off_types.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("number_of_days", sa.Numeric(6, 2), nullable=False),
        sa.Column("reason", sa.String(1000), nullable=True),
        sa.Column(
            "status",
            sa.Enum("draft", "submitted", "approved", "refused", name="time_off_request_status"),
            nullable=False,
            server_default="submitted",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("time_off_requests")
    op.drop_table("time_off_allocations")
    op.drop_table("time_off_types")
    sa.Enum(name="time_off_request_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="time_off_allocation_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="time_off_work_entry_behavior").drop(op.get_bind(), checkfirst=True)
