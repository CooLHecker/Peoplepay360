import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AttendanceStatus(str, enum.Enum):
    """Lifecycle of a single day's attendance record.

    open       -> check-in recorded, check-out not yet done
    completed  -> both check-in and check-out recorded
    """

    open = "open"
    completed = "completed"


class Attendance(Base):
    """One check-in/check-out cycle for an employee.

    Server timestamps (`check_in_at` / `check_out_at`) are the source of
    truth for time, per the attendance spec — the client-supplied clock
    is never trusted. Both are set explicitly by
    app/services/attendance_service.py using `now_ist()` (see
    app/core/timezone.py), so every timestamp here is IST (UTC+5:30),
    not UTC or the server's local zone. Coordinates are stored for both
    check-in and check-out since geofencing is re-validated on each
    action independently (an employee could check in at the office and
    try to check out from home).
    """

    __tablename__ = "attendance_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # server_default is a fallback only (relevant if a row is ever
    # inserted outside attendance_service, e.g. a raw migration/backfill).
    # In normal operation check_in() always supplies an explicit
    # IST-aware value, so this DB-clock default is never actually used.
    check_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    check_in_latitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
    check_in_longitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
    check_in_distance_m: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out_latitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    check_out_longitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    check_out_distance_m: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    status: Mapped[AttendanceStatus] = mapped_column(
        SAEnum(AttendanceStatus, name="attendance_status"),
        default=AttendanceStatus.open,
        server_default=AttendanceStatus.open.value,
        nullable=False,
    )

    # Set once the (stubbed) calendar sync has run for this event, so a
    # retry/backfill job can later tell which records still need a real
    # sync once real OAuth credentials are wired in.
    calendar_synced: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    employee: Mapped["Employee"] = relationship()  # noqa: F821
