"""time off request decision notes

Target database: MySQL / MariaDB (see app/core/config.py DATABASE_URL).

Adds decision_notes to time_off_requests so an approver (typically an
admin/HR manager refusing a request) can leave a note explaining the
decision, which the employee then sees on their own time off page.

Revision ID: 0008
Revises: 0007
Create Date: 2026-09-06

"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("time_off_requests", sa.Column("decision_notes", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("time_off_requests", "decision_notes")
