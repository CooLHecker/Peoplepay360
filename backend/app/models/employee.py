import enum
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class EmploymentStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    terminated = "terminated"


class Employee(Base):
    """Minimal employee stub.

    NOTE: intentionally minimal. The full Employee Management screen
    (department, manager, position, working schedule, contracts, etc.
    per idea.md) will extend this model in a later backend prompt.
    It exists now only so `User.employee_id` has a real record to
    point at, per the login/user-access flow spec (a User and an
    Employee are different records; login resolves User -> Employee).
    """

    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    work_email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    employment_status: Mapped[EmploymentStatus] = mapped_column(
        SAEnum(EmploymentStatus, name="employment_status"),
        default=EmploymentStatus.active,
        server_default=EmploymentStatus.active.value,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User | None"] = relationship(back_populates="employee", uselist=False)
