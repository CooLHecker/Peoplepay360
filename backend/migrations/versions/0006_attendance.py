"""attendance_records table

Target database: MySQL / MariaDB (see app/core/config.py DATABASE_URL).
Same conventions as 0001-0005 (sa.Enum().create()/.drop() are
Postgres-only no-ops on MySQL, kept for portability).

Revision ID: 0006
Revises: 0005
Create Date: 2026-09-06

"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    attendance_status = sa.Enum("open", "completed", name="attendance_status")
    attendance_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "attendance_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "employee_id",
            sa.Integer(),
            sa.ForeignKey("employees.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("check_in_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("check_in_latitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("check_in_longitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("check_in_distance_m", sa.Numeric(10, 2), nullable=False),
        sa.Column("check_out_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_out_latitude", sa.Numeric(9, 6), nullable=True),
        sa.Column("check_out_longitude", sa.Numeric(9, 6), nullable=True),
        sa.Column("check_out_distance_m", sa.Numeric(10, 2), nullable=True),
        sa.Column("status", attendance_status, nullable=False, server_default="open"),
        sa.Column("calendar_synced", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_attendance_records_employee_id", "attendance_records", ["employee_id"])


def downgrade() -> None:
    op.drop_index("ix_attendance_records_employee_id", table_name="attendance_records")
    op.drop_table("attendance_records")
    sa.Enum(name="attendance_status").drop(op.get_bind(), checkfirst=True)
