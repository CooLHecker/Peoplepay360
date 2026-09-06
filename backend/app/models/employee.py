import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class EmploymentStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    terminated = "terminated"


class Employee(Base):
    """Employee record.

    Started as an intentionally minimal stub (see git history) just so
    `User.employee_id` had a real record to point at. phone_number,
    location, department, job_position, and date_of_joining were added
    so the Employee Details / Edit screens have real fields to read
    from and write to instead of hardcoded placeholder text.
    """

    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    work_email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # Free-text "city, country"-style location, or "lat, lng" when set
    # via the browser's geolocation ("Use my current location" in the
    # employee form). Defaults to Gandhinagar, India for new employees
    # when nothing else is supplied.
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    job_position: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date_of_joining: Mapped[date | None] = mapped_column(Date, nullable=True)
    employment_status: Mapped[EmploymentStatus] = mapped_column(
        SAEnum(EmploymentStatus, name="employment_status"),
        default=EmploymentStatus.active,
        server_default=EmploymentStatus.active.value,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User | None"] = relationship(back_populates="employee", uselist=False)
    contracts: Mapped[list["Contract"]] = relationship(
        back_populates="employee", cascade="all, delete-orphan"
    )

