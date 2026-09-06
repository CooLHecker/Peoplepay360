import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PayslipStatus(str, enum.Enum):
    generated = "generated"
    paid = "paid"


class Payslip(Base):
    """One employee's pay computation for one calendar month.

    Simple model to start: gross salary is taken directly from the
    employee's contract wage for the period (see
    ``resolve_contract_for_period`` in the payruns endpoint), with no
    deductions yet, so net_salary == gross_salary for now. Both
    columns exist separately so deduction rules (PF, tax, etc.) can be
    layered in later without changing this table's shape.

    A payslip is only ever created by a payroll run (see
    POST /payruns/run) — never edited directly — and one run is
    idempotent per (employee, period): re-running a period that
    already has a payslip for an employee skips that employee rather
    than creating a duplicate, enforced here by the unique constraint.
    """

    __tablename__ = "payslips"
    __table_args__ = (
        UniqueConstraint("employee_id", "period_year", "period_month", name="uq_payslip_employee_period"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    contract_id: Mapped[int | None] = mapped_column(
        ForeignKey("contracts.id", ondelete="SET NULL"), nullable=True
    )
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    gross_salary: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    net_salary: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[PayslipStatus] = mapped_column(
        SAEnum(PayslipStatus, name="payslip_status"),
        default=PayslipStatus.generated,
        server_default=PayslipStatus.generated.value,
        nullable=False,
    )
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    employee: Mapped["Employee"] = relationship()
    contract: Mapped["Contract | None"] = relationship()
