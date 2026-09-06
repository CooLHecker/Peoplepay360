"""payslips table

Target database: MySQL / MariaDB (see app/core/config.py DATABASE_URL).
Same conventions as 0001-0004 (sa.Enum().create()/.drop() are
Postgres-only no-ops on MySQL, kept for portability).

Revision ID: 0005
Revises: 0004
Create Date: 2026-09-06

"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    payslip_status = sa.Enum("generated", "paid", name="payslip_status")
    payslip_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "payslips",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "employee_id",
            sa.Integer(),
            sa.ForeignKey("employees.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "contract_id",
            sa.Integer(),
            sa.ForeignKey("contracts.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("period_year", sa.Integer(), nullable=False),
        sa.Column("period_month", sa.Integer(), nullable=False),
        sa.Column("gross_salary", sa.Numeric(12, 2), nullable=False),
        sa.Column("net_salary", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", payslip_status, nullable=False, server_default="generated"),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("employee_id", "period_year", "period_month", name="uq_payslip_employee_period"),
    )
    op.create_index("ix_payslips_employee_id", "payslips", ["employee_id"])


def downgrade() -> None:
    op.drop_index("ix_payslips_employee_id", table_name="payslips")
    op.drop_table("payslips")
    sa.Enum(name="payslip_status").drop(op.get_bind(), checkfirst=True)
