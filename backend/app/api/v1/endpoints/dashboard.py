"""Admin dashboard summary.

Previously this endpoint just returned four hardcoded numbers
(``{"employees": 124, "present_today": 112, "pending_time_off": 4,
"next_payroll_total": 1842000}``) with no connection to the rest of
the system. Every field here now comes from the same tables the other
admin modules read and write - Employee, Attendance, TimeOffRequest,
Contract, Payslip, and WorkingSchedule - so this page can never drift
out of sync with what those modules actually show.
"""

import calendar
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.config import get_settings
from app.core.timezone import to_ist, today_ist
from app.db.session import get_db as db_dependency
from app.models import (
    Attendance,
    Contract,
    ContractStatus,
    Employee,
    EmploymentStatus,
    Payslip,
    RoleName,
    TimeOffRequest,
    TimeOffStatus,
    WorkingSchedule,
)
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    PayrollStatus,
    RecentActivityItem,
    WorkforceBreakdown,
)

router = APIRouter()

# Same "who's who" audience as the other admin modules (employees,
# attendance, contracts).
_READ_ROLES = (RoleName.ADMIN, RoleName.HR_MANAGER, RoleName.HR_PAYROLL_ADMIN, RoleName.HR_PAYROLL_USER)

# How many of the most recent attendance rows to scan when looking for
# "today's"/"this month's" record per employee - same bound and
# reasoning as attendance.py's list_attendance.
_RECENT_ATTENDANCE_SCAN_LIMIT = 2000
_RECENT_ACTIVITY_LIMIT = 6


def _period_label(year: int, month: int) -> str:
    return f"{calendar.month_name[month]} {year}"


def _working_days_so_far(today: date) -> int:
    """Weekday count from day 1 of the current month through today -
    same definition reports.py uses for its (real) attendance columns."""
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    return sum(
        1
        for day in range(1, min(today.day, days_in_month) + 1)
        if date(today.year, today.month, day).weekday() < 5
    )


def _initials(name: str) -> str:
    parts = [part for part in name.split() if part]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


@router.get("/", response_model=DashboardSummaryResponse, dependencies=[Depends(require_roles(*_READ_ROLES))])
def dashboard_summary(db: Session = Depends(db_dependency)) -> DashboardSummaryResponse:
    settings = get_settings()
    today = today_ist()
    year, month = today.year, today.month

    employees = db.query(Employee).all()
    total_employees = len(employees)
    active_employees = [e for e in employees if e.employment_status == EmploymentStatus.active]
    workforce = WorkforceBreakdown(
        active=len(active_employees),
        inactive=sum(1 for e in employees if e.employment_status == EmploymentStatus.inactive),
        terminated=sum(1 for e in employees if e.employment_status == EmploymentStatus.terminated),
        onLeaveToday=0,  # filled in below once on-leave employee ids are known
    )
    missing_details_count = sum(1 for e in employees if not e.work_email)

    # ------------------------------------------------------------------
    # Attendance today + month-to-date rate, mirroring attendance.py's
    # list_attendance (today) and reports.py's working-day definition
    # (month-to-date), scoped to active employees only.
    # ------------------------------------------------------------------
    on_leave_employee_ids = set(
        db.scalars(
            select(TimeOffRequest.employee_id).where(
                TimeOffRequest.status == TimeOffStatus.approved,
                TimeOffRequest.start_date <= today,
                TimeOffRequest.end_date >= today,
            )
        ).all()
    )
    workforce.onLeaveToday = sum(1 for e in active_employees if e.id in on_leave_employee_ids)

    recent_records = db.scalars(
        select(Attendance).order_by(Attendance.id.desc()).limit(_RECENT_ATTENDANCE_SCAN_LIMIT)
    ).all()

    latest_today_by_employee: dict[int, Attendance] = {}
    seen_today: set[int] = set()
    days_present_by_employee: dict[int, set[date]] = {}
    month_start = date(year, month, 1)
    for record in recent_records:
        check_in_date = to_ist(record.check_in_at).date()
        if check_in_date >= month_start:
            days_present_by_employee.setdefault(record.employee_id, set()).add(check_in_date)
        if record.employee_id not in seen_today:
            seen_today.add(record.employee_id)
            if check_in_date == today:
                latest_today_by_employee[record.employee_id] = record

    late_cutoff_minutes = settings.attendance_late_after_hour * 60 + settings.attendance_late_after_minute
    present = late = absent = 0
    for employee in active_employees:
        record = latest_today_by_employee.get(employee.id)
        if record is not None:
            check_in_ist = to_ist(record.check_in_at)
            check_in_minutes = check_in_ist.hour * 60 + check_in_ist.minute
            if check_in_minutes > late_cutoff_minutes:
                late += 1
            else:
                present += 1
        elif employee.id in on_leave_employee_ids:
            continue
        else:
            absent += 1

    working_days_so_far = _working_days_so_far(today)
    expected_check_ins = len(active_employees) * working_days_so_far
    active_employee_id_set = {e.id for e in active_employees}
    actual_check_ins = sum(
        len(days) for employee_id, days in days_present_by_employee.items()
        if employee_id in active_employee_id_set
    )
    attendance_rate = (
        round(min(actual_check_ins, expected_check_ins) / expected_check_ins * 100, 1)
        if expected_check_ins > 0
        else None
    )

    # ------------------------------------------------------------------
    # Pending time off (same query as time_off.py's dashboard summary).
    # ------------------------------------------------------------------
    pending_time_off = (
        db.query(TimeOffRequest).filter(TimeOffRequest.status == TimeOffStatus.submitted).count()
    )

    # ------------------------------------------------------------------
    # This month's payroll: real if it's already been run, projected
    # from currently-running contracts otherwise.
    # ------------------------------------------------------------------
    existing_payslips = (
        db.query(Payslip)
        .filter(Payslip.period_year == year, Payslip.period_month == month)
        .all()
    )
    if existing_payslips:
        payroll = PayrollStatus(
            periodLabel=_period_label(year, month),
            periodYear=year,
            periodMonth=month,
            totalGross=float(sum(float(p.gross_salary) for p in existing_payslips)),
            status="completed",
        )
    else:
        running_contracts = (
            db.query(Contract)
            .filter(
                Contract.status != ContractStatus.cancelled,
                Contract.start_date <= today,
            )
            .filter((Contract.end_date.is_(None)) | (Contract.end_date >= today))
            .all()
        )
        # One contract per employee if somehow more than one overlaps -
        # prefer the most recently started, same as contracts/resolve.
        latest_by_employee: dict[int, Contract] = {}
        for contract in sorted(running_contracts, key=lambda c: c.start_date):
            if contract.employee_id in active_employee_id_set:
                latest_by_employee[contract.employee_id] = contract
        payroll = PayrollStatus(
            periodLabel=_period_label(year, month),
            periodYear=year,
            periodMonth=month,
            totalGross=float(sum(float(c.wage) for c in latest_by_employee.values())),
            status="pending",
        )

    # ------------------------------------------------------------------
    # Active working schedules defined.
    # ------------------------------------------------------------------
    active_schedules = db.query(WorkingSchedule).filter(WorkingSchedule.is_active.is_(True)).count()

    # ------------------------------------------------------------------
    # Recent activity: real events from time off decisions, payroll
    # runs, new/updated contracts, and new employees - merged and
    # sorted by when they actually happened.
    # ------------------------------------------------------------------
    events: list[tuple] = []

    recent_decisions = (
        db.query(TimeOffRequest)
        .filter(TimeOffRequest.status.in_([TimeOffStatus.approved, TimeOffStatus.refused]))
        .order_by(TimeOffRequest.updated_at.desc())
        .limit(_RECENT_ACTIVITY_LIMIT)
        .all()
    )
    for req in recent_decisions:
        verb = "approved" if req.status == TimeOffStatus.approved else "refused"
        events.append((req.updated_at, req.employee.full_name, f"'s time off request was {verb}."))

    recent_payslip_batches = (
        db.query(Payslip.period_year, Payslip.period_month, Payslip.generated_at)
        .order_by(Payslip.generated_at.desc())
        .limit(_RECENT_ACTIVITY_LIMIT)
        .all()
    )
    seen_periods: set[tuple[int, int]] = set()
    for period_year, period_month, generated_at in recent_payslip_batches:
        key = (period_year, period_month)
        if key in seen_periods:
            continue
        seen_periods.add(key)
        events.append((generated_at, "Payroll", f" for {_period_label(period_year, period_month)} was generated."))

    recent_contracts = (
        db.query(Contract).order_by(Contract.created_at.desc()).limit(_RECENT_ACTIVITY_LIMIT).all()
    )
    for contract in recent_contracts:
        events.append((contract.created_at, contract.employee.full_name, f"'s contract as {contract.job_position or 'employee'} was created."))

    recent_employees = (
        db.query(Employee).order_by(Employee.created_at.desc()).limit(_RECENT_ACTIVITY_LIMIT).all()
    )
    for employee in recent_employees:
        events.append((employee.created_at, employee.full_name, " was added as a new employee."))

    events.sort(key=lambda item: item[0], reverse=True)
    recent_activity = [
        RecentActivityItem(
            id=f"{index}-{name}",
            actorName=name,
            detail=tail,
            initials=_initials(name),
            occurredAt=occurred_at,
        )
        for index, (occurred_at, name, tail) in enumerate(events[:_RECENT_ACTIVITY_LIMIT])
    ]

    return DashboardSummaryResponse(
        totalEmployees=total_employees,
        presentToday=present,
        lateToday=late,
        onLeaveToday=workforce.onLeaveToday,
        absentToday=absent,
        pendingTimeOff=pending_time_off,
        attendanceRateThisMonth=attendance_rate,
        workforce=workforce,
        payroll=payroll,
        missingDetailsCount=missing_details_count,
        activeWorkingSchedules=active_schedules,
        recentActivity=recent_activity,
    )
