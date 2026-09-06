"""contracts table

Target database: MySQL / MariaDB (see app/core/config.py DATABASE_URL).
`sa.Enum(...).create()/.drop()` below are Postgres-only operations that
no-op harmlessly on MySQL, where ENUM is just an inline column type —
kept so this migration still runs unchanged if the project ever moves
back to Postgres (same convention as 0001).

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-05

"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    contract_status = sa.Enum("draft", "running", "expired", "cancelled", name="contract_status")
    contract_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "contracts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "employee_id",
            sa.Integer(),
            sa.ForeignKey("employees.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("department", sa.String(255), nullable=True),
        sa.Column("job_position", sa.String(255), nullable=True),
        sa.Column("salary_structure_id", sa.String(255), nullable=True),
        sa.Column("wage", sa.Numeric(12, 2), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("status", contract_status, nullable=False, server_default="running"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )
    op.create_index("ix_contracts_employee_id", "contracts", ["employee_id"])


def downgrade() -> None:
    op.drop_index("ix_contracts_employee_id", table_name="contracts")
    op.drop_table("contracts")
    sa.Enum(name="contract_status").drop(op.get_bind(), checkfirst=True)
