from datetime import datetime, time

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, Time
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WorkingSchedule(Base):
    """A named working pattern (per idea.md's WorkingSchedule entity).

    Standalone for now — same "intentionally minimal" pattern as
    Department/Position/Salary Structure in app/models/contract.py:
    Employee doesn't have a real working_schedule_id FK yet (it's a
    plain denormalized label on the employee CSV import/export and on
    the employee dashboard today), so this module exists as the
    place that defines/manages the named patterns without forcing
    that link before the Employee model is extended.
    """

    __tablename__ = "working_schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # A flexible schedule has no fixed clock-in/out window, only a
    # weekly hours target — start_time/end_time are meaningless for it
    # and are required to be absent (see schemas/schedules.py).
    is_flexible: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    hours_per_week: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    days_per_week: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    # IANA timezone name (e.g. "Asia/Kolkata") the fixed hours are
    # anchored to. Validated against zoneinfo in the schema layer.
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata", server_default="Asia/Kolkata", nullable=False)
    # Retiring a schedule shouldn't delete it out from under
    # historical references once Employee/Contract link to it, so
    # this is a soft toggle rather than a delete.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
