"""employee contact/work detail columns

Target database: MySQL / MariaDB (see app/core/config.py DATABASE_URL).

Adds phone_number, location, department, job_position, and
date_of_joining to employees so the Employee Details / Edit screens
have real, persisted fields instead of hardcoded placeholder text.

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-06

"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("phone_number", sa.String(length=32), nullable=True))
    op.add_column("employees", sa.Column("location", sa.String(length=255), nullable=True))
    op.add_column("employees", sa.Column("department", sa.String(length=255), nullable=True))
    op.add_column("employees", sa.Column("job_position", sa.String(length=255), nullable=True))
    op.add_column("employees", sa.Column("date_of_joining", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("employees", "date_of_joining")
    op.drop_column("employees", "job_position")
    op.drop_column("employees", "department")
    op.drop_column("employees", "location")
    op.drop_column("employees", "phone_number")
