import calendar
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db as db_dependency
from app.models import Contract, ContractStatus, Employee, EmploymentStatus, Payslip, RoleName
from app.schemas.payroll import PayrunSummary, RunPayrollRequest, RunPayrollResult

router = APIRouter()

# Read access: anyone who needs to see payroll totals.
_READ_ROLES = (RoleName.ADMIN, RoleName.HR_MANAGER, RoleName.HR_PAYROLL_ADMIN, RoleName.HR_PAYROLL_USER)
# Actually running payroll (creating payslips) is payroll-admin territory.
_RUN_ROLES = (RoleName.ADMIN, RoleName.HR_PAYROLL_ADMIN)


def _period_label(year: int, month: int) -> str:
    return f"{calendar.month_name[month]} {year}"


def _resolve_contract_for_period(db: Session, employee_id: int, year: int, month: int) -> Contract | None:
    """Find the contract that covers the given payroll period.

    Mirrors the `/contracts/resolve` logic (see contracts endpoint):
    matches on start_date <= last_day_of_month <= end_date (or
    open-ended), excludes cancelled contracts, and prefers the most
    recently started one if more than one somehow overlaps.
    """
    last_day = date(year, month, calendar.monthrange(year, month)[1])
    return (
        db.query(Contract)
        .filter(
            Contract.employee_id == employee_id,
            Contract.status != ContractStatus.cancelled,
            Contract.start_date <= last_day,
        )
        .filter((Contract.end_date.is_(None)) | (Contract.end_date >= last_day))
        .order_by(Contract.start_date.desc())
        .first()
    )


@router.get("/", response_model=list[PayrunSummary], dependencies=[Depends(require_roles(*_READ_ROLES))])
def list_payruns(db: Session = Depends(db_dependency)) -> list[PayrunSummary]:
    """One row per period that has ever had payroll run for it,
    aggregated from actual payslips — not hardcoded sample data."""
    rows = (
        db.query(
            Payslip.period_year,
            Payslip.period_month,
            func.count(Payslip.id),
            func.sum(Payslip.gross_salary),
        )
        .group_by(Payslip.period_year, Payslip.period_month)
        .order_by(Payslip.period_year.desc(), Payslip.period_month.desc())
        .all()
    )
    return [
        PayrunSummary(
            id=f"PAY-{year}-{month:02d}",
            period=_period_label(year, month),
            periodYear=year,
            periodMonth=month,
            employees=count,
            gross=float(gross or 0),
            status="Completed",
        )
        for year, month, count, gross in rows
    ]


@router.post("/run", response_model=RunPayrollResult, dependencies=[Depends(require_roles(*_RUN_ROLES))])
def run_payroll(payload: RunPayrollRequest, db: Session = Depends(db_dependency)) -> RunPayrollResult:
    """Generate payslips for every active employee for a period.

    Gross salary is simply the wage on whichever contract covers that
    period (no deduction rules yet, so net == gross). Re-running a
    period that already has a payslip for an employee leaves that
    employee's payslip untouched rather than duplicating or
    overwriting it — this endpoint is safe to click more than once.
    """
    today = date.today()
    year = payload.period_year or today.year
    month = payload.period_month or today.month

    existing_employee_ids = {
        row[0]
        for row in db.query(Payslip.employee_id).filter(
            Payslip.period_year == year, Payslip.period_month == month
        )
    }

    active_employees = (
        db.query(Employee).filter(Employee.employment_status == EmploymentStatus.active).all()
    )

    generated = 0
    skipped_no_contract = 0
    skipped_already_exists = 0
    total_gross = 0.0

    for employee in active_employees:
        if employee.id in existing_employee_ids:
            skipped_already_exists += 1
            continue

        contract = _resolve_contract_for_period(db, employee.id, year, month)
        if contract is None:
            skipped_no_contract += 1
            continue

        gross = float(contract.wage)
        payslip = Payslip(
            employee_id=employee.id,
            contract_id=contract.id,
            period_year=year,
            period_month=month,
            gross_salary=gross,
            net_salary=gross,
        )
        db.add(payslip)
        generated += 1
        total_gross += gross

    db.commit()

    return RunPayrollResult(
        periodYear=year,
        periodMonth=month,
        period=_period_label(year, month),
        generated=generated,
        skippedNoContract=skipped_no_contract,
        skippedAlreadyExists=skipped_already_exists,
        totalGross=total_gross,
    )
