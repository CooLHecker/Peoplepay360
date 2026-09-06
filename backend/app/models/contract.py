import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ContractStatus(str, enum.Enum):
    draft = "draft"
    running = "running"
    expired = "expired"
    cancelled = "cancelled"


class Contract(Base):
    """An employee's employment agreement for a given period.

    Per idea.md section B (Contract Management): an employee can have
    several contracts over time (renewals, promotions, re-hires), and
    payroll must resolve the contract applicable to a given period
    rather than always using the latest one — see
    ``resolve_active_contract`` in the contracts endpoint.

    ``department`` / ``job_position`` / ``salary_structure_id`` are
    plain denormalized fields for now rather than foreign keys: the
    Department, Position, and Salary Structure modules don't have
    real backend models yet (same "intentionally minimal" pattern as
    Employee — see app/models/employee.py). They can become FKs once
    those modules exist without changing this table's public shape.
    """

    __tablename__ = "contracts"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    job_position: Mapped[str | None] = mapped_column(String(255), nullable=True)
    salary_structure_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    wage: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    # NULL end_date means open-ended / ongoing.
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # Only "cancelled" is ever stored as a deliberate action; "draft"
    # vs "running" vs "expired" is otherwise derived from today's date
    # against start_date/end_date (see _resolve_status in the endpoint)
    # so it never drifts out of sync with the dates as time passes.
    status: Mapped[ContractStatus] = mapped_column(
        SAEnum(ContractStatus, name="contract_status"),
        default=ContractStatus.running,
        server_default=ContractStatus.running.value,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    employee: Mapped["Employee"] = relationship(back_populates="contracts")
