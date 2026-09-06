from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_roles
from app.core.config import get_settings
from app.core.timezone import to_ist, today_ist
from app.db.session import get_db as db_dependency
from app.models import (
    Attendance,
    AttendanceStatus,
    Employee,
    EmploymentStatus,
    RoleName,
    TimeOffRequest,
    TimeOffStatus,
    User,
)
from app.schemas.attendance import (
    AttendanceAdminRow,
    AttendanceCheckRequest,
    AttendanceResponse,
    AttendanceSummaryResponse,
)
from app.services import attendance_service

router = APIRouter()

# Same roles allowed to view the employee directory (app/api/v1/endpoints/employees.py) —
# the attendance dashboard is the same "who's who" audience.
_ADMIN_READ_ROLES = (RoleName.ADMIN, RoleName.HR_MANAGER, RoleName.HR_PAYROLL_ADMIN, RoleName.HR_PAYROLL_USER)

# How many of the most recent attendance rows (across all employees) to
# scan when looking for "today's" record per employee. Filtering by
# IST calendar day happens in Python (see to_ist()) rather than in SQL,
# since not every database backend round-trips a stored UTC offset the
# same way — this bound just keeps that scan cheap.
_RECENT_ROWS_SCAN_LIMIT = 1000


@router.get("/", response_model=AttendanceSummaryResponse, dependencies=[Depends(require_roles(*_ADMIN_READ_ROLES))])
async def list_attendance(db: Session = Depends(db_dependency)):
    """Real, per-employee attendance for today — backs the admin
    Attendance dashboard (AttendancePage.tsx). Previously that page
    rendered a hardcoded mock array with no connection to actual
    check-ins; every row and every metric card here is now derived
    from the same `Attendance`/`TimeOffRequest` records the employee
    dashboard writes to, so the two screens can never disagree.
    """
    settings = get_settings()
    today = today_ist()

    # Terminated/inactive employees have no shift to be present or late for
    # today, so they're left off the dashboard rather than showing as "absent".
    employees = db.scalars(
        select(Employee).where(Employee.employment_status == EmploymentStatus.active).order_by(Employee.full_name)
    ).all()

    # Most recent attendance record per employee that actually falls on
    # today's IST calendar day (a record from yesterday, even if still
    # technically "open", shouldn't render as today's status).
    recent_records = db.scalars(
        select(Attendance).order_by(Attendance.id.desc()).limit(_RECENT_ROWS_SCAN_LIMIT)
    ).all()
    latest_record_by_employee: dict[int, Attendance] = {}
    seen_employee_ids: set[int] = set()
    for record in recent_records:
        if record.employee_id in seen_employee_ids:
            continue
        seen_employee_ids.add(record.employee_id)
        if to_ist(record.check_in_at).date() == today:
            latest_record_by_employee[record.employee_id] = record

    # Employees with an approved leave request that covers today.
    on_leave_employee_ids = set(
        db.scalars(
            select(TimeOffRequest.employee_id).where(
                TimeOffRequest.status == TimeOffStatus.approved,
                TimeOffRequest.start_date <= today,
                TimeOffRequest.end_date >= today,
            )
        ).all()
    )

    late_cutoff_minutes = settings.attendance_late_after_hour * 60 + settings.attendance_late_after_minute

    rows: list[AttendanceAdminRow] = []
    present = late = on_leave = absent = 0
    for employee in employees:
        record = latest_record_by_employee.get(employee.id)
        if record is not None:
            check_in_ist = to_ist(record.check_in_at)
            check_in_minutes = check_in_ist.hour * 60 + check_in_ist.minute
            row_status = "late" if check_in_minutes > late_cutoff_minutes else "present"
            if row_status == "late":
                late += 1
            else:
                present += 1
        elif employee.id in on_leave_employee_ids:
            row_status = "on_leave"
            on_leave += 1
        else:
            row_status = "absent"
            absent += 1

        rows.append(
            AttendanceAdminRow(
                employeeId=str(employee.id),
                fullName=employee.full_name,
                workEmail=employee.work_email,
                checkInAt=record.check_in_at if record else None,
                checkOutAt=record.check_out_at if record else None,
                status=row_status,
            )
        )

    return AttendanceSummaryResponse(date=today, present=present, late=late, onLeave=on_leave, absent=absent, rows=rows)


def _to_response(record: Attendance) -> AttendanceResponse:
    return AttendanceResponse(
        id=str(record.id),
        status=record.status.value,
        checkInAt=record.check_in_at,
        checkInDistanceM=float(record.check_in_distance_m),
        checkOutAt=record.check_out_at,
        checkOutDistanceM=float(record.check_out_distance_m) if record.check_out_distance_m is not None else None,
        calendarSynced=record.calendar_synced,
    )


@router.get("/me", response_model=AttendanceResponse | None)
async def my_current_attendance(
    db: Session = Depends(db_dependency),
    user: User = Depends(get_current_active_user),
):
    """Latest attendance record for the caller's own employee record —
    used by the employee dashboard to restore check-in state after a
    page refresh (otherwise the UI would forget an open check-in and
    let someone check in twice)."""
    if user.employee_id is None:
        return None

    record = db.scalar(
        select(Attendance)
        .where(Attendance.employee_id == user.employee_id)
        .order_by(Attendance.id.desc())
    )
    if record is None:
        return None
    # Only surface it as "today's attendance" if it's still open (needs
    # a check-out) or was actually checked in today — otherwise a
    # completed record from a previous day would wrongly render as
    # today's status after a page refresh.
    is_today = to_ist(record.check_in_at).date() == today_ist()
    if record.status != AttendanceStatus.open and not is_today:
        return None
    return _to_response(record)


@router.get("/history", response_model=list[AttendanceResponse])
async def my_attendance_history(
    db: Session = Depends(db_dependency),
    user: User = Depends(get_current_active_user),
    limit: int = 31,
):
    """This employee's own past attendance records, most recent first —
    backs the "Attendance this month" table on the employee dashboard.
    Previously that table was hardcoded mock data; nothing checked in
    here ever reached it."""
    if user.employee_id is None:
        return []

    records = db.scalars(
        select(Attendance)
        .where(Attendance.employee_id == user.employee_id)
        .order_by(Attendance.id.desc())
        .limit(limit)
    ).all()
    return [_to_response(record) for record in records]


@router.post("/check-in", response_model=AttendanceResponse)
async def check_in(
    payload: AttendanceCheckRequest,
    db: Session = Depends(db_dependency),
    user: User = Depends(get_current_active_user),
):
    record = attendance_service.check_in(
        db,
        user_employee_id=user.employee_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    return _to_response(record)


@router.post("/check-out", response_model=AttendanceResponse)
async def check_out(
    payload: AttendanceCheckRequest,
    db: Session = Depends(db_dependency),
    user: User = Depends(get_current_active_user),
):
    record = attendance_service.check_out(
        db,
        user_employee_id=user.employee_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    return _to_response(record)
