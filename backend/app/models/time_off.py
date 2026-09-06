import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TimeOffStatus(str, enum.Enum):
    """Shared workflow for both allocations and requests (idea.md
    section D / corrections.md sections 30-31):

        draft -> submitted -> approved / refused

    Only "approved" allocations create available balance, and only
    "approved" requests consume it (corrections.md section 31).
    """

    draft = "draft"
    submitted = "submitted"
    approved = "approved"
    refused = "refused"


class TimeOffWorkEntryBehavior(str, enum.Enum):
    """How a time off type is treated for payroll purposes
    (corrections.md section 32: "Payroll / Work Entry behavior")."""

    paid = "paid"
    unpaid = "unpaid"


class TimeOffType(Base):
    """Defines the behavior of leave requests (corrections.md section 32).

    Standalone, same "intentionally minimal" pattern as WorkingSchedule:
    not linked to Employee/Contract by a real FK yet, just the shared
    catalog that Allocations/Requests point at.
    """

    __tablename__ = "time_off_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Some types (e.g. unpaid leave) may not require a pre-approved
    # allocation before employees can request them.
    requires_allocation: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    work_entry_behavior: Mapped[TimeOffWorkEntryBehavior] = mapped_column(
        SAEnum(TimeOffWorkEntryBehavior, name="time_off_work_entry_behavior"),
        default=TimeOffWorkEntryBehavior.paid,
        server_default=TimeOffWorkEntryBehavior.paid.value,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    allocations: Mapped[list["TimeOffAllocation"]] = relationship(
        back_populates="time_off_type", cascade="all, delete-orphan"
    )
    requests: Mapped[list["TimeOffRequest"]] = relationship(
        back_populates="time_off_type", cascade="all, delete-orphan"
    )


class TimeOffAllocation(Base):
    """A grant of leave days to an employee for a validity period
    (corrections.md section 31). Only ``approved`` allocations count
    toward available balance.
    """

    __tablename__ = "time_off_allocations"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    time_off_type_id: Mapped[int] = mapped_column(
        ForeignKey("time_off_types.id", ondelete="CASCADE"), nullable=False, index=True
    )
    allocated_days: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    # NULL end_date means the allocation never expires.
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[TimeOffStatus] = mapped_column(
        SAEnum(TimeOffStatus, name="time_off_allocation_status"),
        default=TimeOffStatus.submitted,
        server_default=TimeOffStatus.submitted.value,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    employee: Mapped["Employee"] = relationship()
    time_off_type: Mapped["TimeOffType"] = relationship(back_populates="allocations")


class TimeOffRequest(Base):
    """An employee's leave request (corrections.md section 30)."""

    __tablename__ = "time_off_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    time_off_type_id: Mapped[int] = mapped_column(
        ForeignKey("time_off_types.id", ondelete="CASCADE"), nullable=False, index=True
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    # Stored rather than derived on read: inclusive calendar-day count
    # at submission time (end_date - start_date + 1). Kept even though
    # it's computable so historical requests don't shift if the
    # counting rule ever changes.
    number_of_days: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    status: Mapped[TimeOffStatus] = mapped_column(
        SAEnum(TimeOffStatus, name="time_off_request_status"),
        default=TimeOffStatus.submitted,
        server_default=TimeOffStatus.submitted.value,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    employee: Mapped["Employee"] = relationship()
    time_off_type: Mapped["TimeOffType"] = relationship(back_populates="requests")
