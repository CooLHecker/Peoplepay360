from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_active_user, require_roles
from app.db.session import get_db as db_dependency
from app.models import (
    Employee,
    RoleName,
    TimeOffAllocation,
    TimeOffRequest,
    TimeOffStatus,
    TimeOffType,
    User,
)
from app.schemas.time_off import (
    TimeOffAllocationCreate,
    TimeOffAllocationResponse,
    TimeOffAllocationUpdate,
    TimeOffBalanceResponse,
    TimeOffRequestCreate,
    TimeOffRequestDecision,
    TimeOffRequestResponse,
    TimeOffRequestUpdate,
    TimeOffSummaryResponse,
    TimeOffTypeCreate,
    TimeOffTypeResponse,
    TimeOffTypeUpdate,
)

router = APIRouter()
types_router = APIRouter()
allocations_router = APIRouter()
requests_router = APIRouter()

# Same split used across the other HR modules (idea.md section 9):
# every HR/payroll role can read, but defining policy (types) and
# granting days (allocations) is HR-records + admin territory.
_READ_ROLES = (RoleName.ADMIN, RoleName.HR_MANAGER, RoleName.HR_PAYROLL_ADMIN, RoleName.HR_PAYROLL_USER)
_WRITE_ROLES = (RoleName.ADMIN, RoleName.HR_MANAGER, RoleName.HR_PAYROLL_ADMIN)
_HR_ROLE_NAMES = set(_READ_ROLES)


def _is_hr(user: User) -> bool:
    return bool({r.name for r in user.roles} & _HR_ROLE_NAMES)


def _own_employee_id_or_403(user: User) -> int:
    """Resolve the calling user's own employee record for self-service
    access to their own requests/allocations/balance (corrections.md's
    "My Time Off" page). HR roles never need this - they pass an
    explicit employee_id instead."""
    if user.employee_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not linked to an employee record.",
        )
    return user.employee_id


def _overlap_days(a_start: date, a_end: date, b_start: date, b_end: date) -> float:
    start = max(a_start, b_start)
    end = min(a_end, b_end)
    if end < start:
        return 0.0
    return float((end - start).days + 1)


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------


def _type_response(t: TimeOffType) -> TimeOffTypeResponse:
    return TimeOffTypeResponse(
        id=str(t.id),
        name=t.name,
        description=t.description,
        requiresAllocation=t.requires_allocation,
        workEntryBehavior=t.work_entry_behavior.value,
        isActive=t.is_active,
    )


def _get_type_or_404(db: Session, type_id: int) -> TimeOffType:
    time_off_type = db.get(TimeOffType, type_id)
    if time_off_type is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time off type not found")
    return time_off_type


@types_router.get(
    "/", response_model=list[TimeOffTypeResponse], dependencies=[Depends(get_current_active_user)]
)
def list_time_off_types(
    include_inactive: bool = Query(default=False),
    db: Session = Depends(db_dependency),
) -> list[TimeOffTypeResponse]:
    query = db.query(TimeOffType)
    if not include_inactive:
        query = query.filter(TimeOffType.is_active.is_(True))
    types = query.order_by(TimeOffType.name.asc()).all()
    return [_type_response(t) for t in types]


@types_router.get(
    "/{type_id}", response_model=TimeOffTypeResponse, dependencies=[Depends(get_current_active_user)]
)
def get_time_off_type(type_id: int, db: Session = Depends(db_dependency)) -> TimeOffTypeResponse:
    return _type_response(_get_type_or_404(db, type_id))


@types_router.post(
    "/",
    response_model=TimeOffTypeResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(*_WRITE_ROLES))],
)
def create_time_off_type(payload: TimeOffTypeCreate, db: Session = Depends(db_dependency)) -> TimeOffTypeResponse:
    existing = db.query(TimeOffType).filter(TimeOffType.name == payload.name).first()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A time off type with that name already exists.")
    time_off_type = TimeOffType(
        name=payload.name,
        description=payload.description,
        requires_allocation=payload.requires_allocation,
        work_entry_behavior=payload.work_entry_behavior,
        is_active=payload.is_active,
    )
    db.add(time_off_type)
    db.commit()
    db.refresh(time_off_type)
    return _type_response(time_off_type)


@types_router.put(
    "/{type_id}", response_model=TimeOffTypeResponse, dependencies=[Depends(require_roles(*_WRITE_ROLES))]
)
def update_time_off_type(
    type_id: int, payload: TimeOffTypeUpdate, db: Session = Depends(db_dependency)
) -> TimeOffTypeResponse:
    time_off_type = _get_type_or_404(db, type_id)
    duplicate = (
        db.query(TimeOffType)
        .filter(TimeOffType.name == payload.name, TimeOffType.id != type_id)
        .first()
    )
    if duplicate is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A time off type with that name already exists.")
    time_off_type.name = payload.name
    time_off_type.description = payload.description
    time_off_type.requires_allocation = payload.requires_allocation
    time_off_type.work_entry_behavior = payload.work_entry_behavior
    time_off_type.is_active = payload.is_active
    db.commit()
    db.refresh(time_off_type)
    return _type_response(time_off_type)


@types_router.delete(
    "/{type_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles(*_WRITE_ROLES))]
)
def delete_time_off_type(type_id: int, db: Session = Depends(db_dependency)) -> None:
    time_off_type = _get_type_or_404(db, type_id)
    db.delete(time_off_type)
    db.commit()


# ---------------------------------------------------------------------------
# Balance helper (corrections.md section 31: Remaining = Approved
# Allocation - Approved Time Off; only approved allocations count)
# ---------------------------------------------------------------------------


def _balance_for(db: Session, employee_id: int, time_off_type_id: int, on: date | None = None) -> tuple[float, float]:
    reference = on or date.today()
    allocated = (
        db.query(TimeOffAllocation)
        .filter(
            TimeOffAllocation.employee_id == employee_id,
            TimeOffAllocation.time_off_type_id == time_off_type_id,
            TimeOffAllocation.status == TimeOffStatus.approved,
            TimeOffAllocation.start_date <= reference,
        )
        .filter((TimeOffAllocation.end_date.is_(None)) | (TimeOffAllocation.end_date >= reference))
        .all()
    )
    allocated_total = sum(float(a.allocated_days) for a in allocated)

    used = (
        db.query(TimeOffRequest)
        .filter(
            TimeOffRequest.employee_id == employee_id,
            TimeOffRequest.time_off_type_id == time_off_type_id,
            TimeOffRequest.status == TimeOffStatus.approved,
        )
        .all()
    )
    used_total = sum(float(r.number_of_days) for r in used)

    return allocated_total, used_total


# ---------------------------------------------------------------------------
# Allocations
# ---------------------------------------------------------------------------


def _allocation_response(db: Session, allocation: TimeOffAllocation) -> TimeOffAllocationResponse:
    allocated_total, used_total = _balance_for(db, allocation.employee_id, allocation.time_off_type_id)
    return TimeOffAllocationResponse(
        id=str(allocation.id),
        employeeId=str(allocation.employee_id),
        employeeName=allocation.employee.full_name,
        timeOffTypeId=str(allocation.time_off_type_id),
        timeOffTypeName=allocation.time_off_type.name,
        allocatedDays=float(allocation.allocated_days),
        usedDays=used_total,
        remainingDays=allocated_total - used_total,
        startDate=allocation.start_date,
        endDate=allocation.end_date,
        status=allocation.status.value,
        notes=allocation.notes,
    )


def _get_employee_or_400(db: Session, employee_id: int) -> Employee:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No employee exists with that employee_id.")
    return employee


def _get_type_or_400(db: Session, type_id: int) -> TimeOffType:
    time_off_type = db.get(TimeOffType, type_id)
    if time_off_type is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No time off type exists with that time_off_type_id.")
    return time_off_type


def _get_allocation_or_404(db: Session, allocation_id: int) -> TimeOffAllocation:
    allocation = (
        db.query(TimeOffAllocation)
        .options(joinedload(TimeOffAllocation.employee), joinedload(TimeOffAllocation.time_off_type))
        .filter(TimeOffAllocation.id == allocation_id)
        .first()
    )
    if allocation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation not found")
    return allocation


@allocations_router.get("/", response_model=list[TimeOffAllocationResponse])
def list_allocations(
    employee_id: int | None = Query(default=None),
    db: Session = Depends(db_dependency),
    user: User = Depends(get_current_active_user),
) -> list[TimeOffAllocationResponse]:
    if not _is_hr(user):
        employee_id = _own_employee_id_or_403(user)
    query = db.query(TimeOffAllocation).options(
        joinedload(TimeOffAllocation.employee), joinedload(TimeOffAllocation.time_off_type)
    )
    if employee_id is not None:
        query = query.filter(TimeOffAllocation.employee_id == employee_id)
    allocations = query.order_by(TimeOffAllocation.start_date.desc()).all()
    return [_allocation_response(db, a) for a in allocations]


@allocations_router.get("/{allocation_id}", response_model=TimeOffAllocationResponse)
def get_allocation(
    allocation_id: int,
    db: Session = Depends(db_dependency),
    user: User = Depends(get_current_active_user),
) -> TimeOffAllocationResponse:
    allocation = _get_allocation_or_404(db, allocation_id)
    if not _is_hr(user) and allocation.employee_id != _own_employee_id_or_403(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view this allocation")
    return _allocation_response(db, allocation)


@allocations_router.post(
    "/",
    response_model=TimeOffAllocationResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(*_WRITE_ROLES))],
)
def create_allocation(payload: TimeOffAllocationCreate, db: Session = Depends(db_dependency)) -> TimeOffAllocationResponse:
    _get_employee_or_400(db, payload.employee_id)
    _get_type_or_400(db, payload.time_off_type_id)
    allocation = TimeOffAllocation(
        employee_id=payload.employee_id,
        time_off_type_id=payload.time_off_type_id,
        allocated_days=payload.allocated_days,
        start_date=payload.start_date,
        end_date=payload.end_date,
        notes=payload.notes,
    )
    db.add(allocation)
    db.commit()
    db.refresh(allocation)
    return _allocation_response(db, _get_allocation_or_404(db, allocation.id))


@allocations_router.put(
    "/{allocation_id}", response_model=TimeOffAllocationResponse, dependencies=[Depends(require_roles(*_WRITE_ROLES))]
)
def update_allocation(
    allocation_id: int, payload: TimeOffAllocationUpdate, db: Session = Depends(db_dependency)
) -> TimeOffAllocationResponse:
    allocation = _get_allocation_or_404(db, allocation_id)
    if allocation.status != TimeOffStatus.draft and allocation.status != TimeOffStatus.submitted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft or submitted allocations can be edited")
    if payload.employee_id != allocation.employee_id:
        _get_employee_or_400(db, payload.employee_id)
    if payload.time_off_type_id != allocation.time_off_type_id:
        _get_type_or_400(db, payload.time_off_type_id)
    allocation.employee_id = payload.employee_id
    allocation.time_off_type_id = payload.time_off_type_id
    allocation.allocated_days = payload.allocated_days
    allocation.start_date = payload.start_date
    allocation.end_date = payload.end_date
    allocation.notes = payload.notes
    db.commit()
    db.refresh(allocation)
    return _allocation_response(db, _get_allocation_or_404(db, allocation.id))


@allocations_router.post(
    "/{allocation_id}/approve",
    response_model=TimeOffAllocationResponse,
    dependencies=[Depends(require_roles(*_WRITE_ROLES))],
)
def approve_allocation(allocation_id: int, db: Session = Depends(db_dependency)) -> TimeOffAllocationResponse:
    allocation = _get_allocation_or_404(db, allocation_id)
    if allocation.status != TimeOffStatus.submitted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only submitted allocations can be approved")
    allocation.status = TimeOffStatus.approved
    db.commit()
    db.refresh(allocation)
    return _allocation_response(db, allocation)


@allocations_router.post(
    "/{allocation_id}/refuse",
    response_model=TimeOffAllocationResponse,
    dependencies=[Depends(require_roles(*_WRITE_ROLES))],
)
def refuse_allocation(allocation_id: int, db: Session = Depends(db_dependency)) -> TimeOffAllocationResponse:
    allocation = _get_allocation_or_404(db, allocation_id)
    if allocation.status != TimeOffStatus.submitted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only submitted allocations can be refused")
    allocation.status = TimeOffStatus.refused
    db.commit()
    db.refresh(allocation)
    return _allocation_response(db, allocation)


@allocations_router.delete(
    "/{allocation_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles(*_WRITE_ROLES))]
)
def delete_allocation(allocation_id: int, db: Session = Depends(db_dependency)) -> None:
    allocation = _get_allocation_or_404(db, allocation_id)
    db.delete(allocation)
    db.commit()


# ---------------------------------------------------------------------------
# Requests
# ---------------------------------------------------------------------------


def _request_response(db: Session, req: TimeOffRequest) -> TimeOffRequestResponse:
    allocated_total, used_total = _balance_for(db, req.employee_id, req.time_off_type_id)
    return TimeOffRequestResponse(
        id=str(req.id),
        employeeId=str(req.employee_id),
        employeeName=req.employee.full_name,
        timeOffTypeId=str(req.time_off_type_id),
        timeOffTypeName=req.time_off_type.name,
        startDate=req.start_date,
        endDate=req.end_date,
        numberOfDays=float(req.number_of_days),
        reason=req.reason,
        availableBalance=allocated_total - used_total,
        status=req.status.value,
    )


def _get_request_or_404(db: Session, request_id: int) -> TimeOffRequest:
    req = (
        db.query(TimeOffRequest)
        .options(joinedload(TimeOffRequest.employee), joinedload(TimeOffRequest.time_off_type))
        .filter(TimeOffRequest.id == request_id)
        .first()
    )
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time off request not found")
    return req


def _require_access(user: User, req: TimeOffRequest) -> None:
    if not _is_hr(user) and req.employee_id != _own_employee_id_or_403(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this request")


@requests_router.get("/", response_model=list[TimeOffRequestResponse])
def list_requests(
    employee_id: int | None = Query(default=None),
    request_status: str | None = Query(default=None, alias="status"),
    db: Session = Depends(db_dependency),
    user: User = Depends(get_current_active_user),
) -> list[TimeOffRequestResponse]:
    if not _is_hr(user):
        employee_id = _own_employee_id_or_403(user)
    query = db.query(TimeOffRequest).options(
        joinedload(TimeOffRequest.employee), joinedload(TimeOffRequest.time_off_type)
    )
    if employee_id is not None:
        query = query.filter(TimeOffRequest.employee_id == employee_id)
    if request_status is not None:
        try:
            query = query.filter(TimeOffRequest.status == TimeOffStatus(request_status))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter")
    requests_ = query.order_by(TimeOffRequest.start_date.desc()).all()
    return [_request_response(db, r) for r in requests_]


@requests_router.get("/{request_id}", response_model=TimeOffRequestResponse)
def get_request(
    request_id: int, db: Session = Depends(db_dependency), user: User = Depends(get_current_active_user)
) -> TimeOffRequestResponse:
    req = _get_request_or_404(db, request_id)
    _require_access(user, req)
    return _request_response(db, req)


@requests_router.post("/", response_model=TimeOffRequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: TimeOffRequestCreate,
    db: Session = Depends(db_dependency),
    user: User = Depends(get_current_active_user),
) -> TimeOffRequestResponse:
    if _is_hr(user):
        if payload.employee_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="employee_id is required")
        employee_id = payload.employee_id
    else:
        own_id = _own_employee_id_or_403(user)
        if payload.employee_id is not None and payload.employee_id != own_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only submit time off requests for yourself")
        employee_id = own_id

    _get_employee_or_400(db, employee_id)
    time_off_type = _get_type_or_400(db, payload.time_off_type_id)
    if not time_off_type.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This time off type is no longer active")

    number_of_days = float((payload.end_date - payload.start_date).days + 1)

    # Drafts aren't committed yet, so they don't need to pass the
    # balance check - only a submitted request actually competes for
    # the employee's available days.
    if time_off_type.requires_allocation and not payload.save_as_draft:
        allocated_total, used_total = _balance_for(db, employee_id, payload.time_off_type_id, on=payload.start_date)
        if number_of_days > (allocated_total - used_total):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This request exceeds the employee's available balance for this time off type.",
            )

    req = TimeOffRequest(
        employee_id=employee_id,
        time_off_type_id=payload.time_off_type_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        number_of_days=number_of_days,
        reason=payload.reason,
        status=TimeOffStatus.draft if payload.save_as_draft else TimeOffStatus.submitted,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _request_response(db, _get_request_or_404(db, req.id))


@requests_router.put("/{request_id}", response_model=TimeOffRequestResponse)
def update_request(
    request_id: int,
    payload: TimeOffRequestUpdate,
    db: Session = Depends(db_dependency),
    user: User = Depends(get_current_active_user),
) -> TimeOffRequestResponse:
    req = _get_request_or_404(db, request_id)
    _require_access(user, req)
    if req.status not in (TimeOffStatus.draft, TimeOffStatus.submitted):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft or submitted requests can be edited")

    target_employee_id = payload.employee_id or req.employee_id
    if not _is_hr(user) and target_employee_id != _own_employee_id_or_403(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own requests")
    _get_employee_or_400(db, target_employee_id)
    _get_type_or_400(db, payload.time_off_type_id)

    req.employee_id = target_employee_id
    req.time_off_type_id = payload.time_off_type_id
    req.start_date = payload.start_date
    req.end_date = payload.end_date
    req.number_of_days = float((payload.end_date - payload.start_date).days + 1)
    req.reason = payload.reason
    db.commit()
    db.refresh(req)
    return _request_response(db, _get_request_or_404(db, req.id))


@requests_router.post("/{request_id}/submit", response_model=TimeOffRequestResponse)
def submit_request(
    request_id: int, db: Session = Depends(db_dependency), user: User = Depends(get_current_active_user)
) -> TimeOffRequestResponse:
    req = _get_request_or_404(db, request_id)
    _require_access(user, req)
    if req.status != TimeOffStatus.draft:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft requests can be submitted")
    if req.time_off_type.requires_allocation:
        allocated_total, used_total = _balance_for(db, req.employee_id, req.time_off_type_id, on=req.start_date)
        if float(req.number_of_days) > (allocated_total - used_total):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This request exceeds the employee's available balance for this time off type.",
            )
    req.status = TimeOffStatus.submitted
    db.commit()
    db.refresh(req)
    return _request_response(db, req)


@requests_router.post(
    "/{request_id}/approve", response_model=TimeOffRequestResponse, dependencies=[Depends(require_roles(*_WRITE_ROLES))]
)
def approve_request(
    request_id: int, payload: TimeOffRequestDecision | None = None, db: Session = Depends(db_dependency)
) -> TimeOffRequestResponse:
    req = _get_request_or_404(db, request_id)
    if req.status != TimeOffStatus.submitted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only submitted requests can be approved")
    allocated_total, used_total = _balance_for(db, req.employee_id, req.time_off_type_id, on=req.start_date)
    if req.time_off_type.requires_allocation and float(req.number_of_days) > (allocated_total - used_total):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approving this request would exceed the employee's available balance.",
        )
    req.status = TimeOffStatus.approved
    db.commit()
    db.refresh(req)
    return _request_response(db, req)


@requests_router.post(
    "/{request_id}/refuse", response_model=TimeOffRequestResponse, dependencies=[Depends(require_roles(*_WRITE_ROLES))]
)
def refuse_request(
    request_id: int, payload: TimeOffRequestDecision | None = None, db: Session = Depends(db_dependency)
) -> TimeOffRequestResponse:
    req = _get_request_or_404(db, request_id)
    if req.status != TimeOffStatus.submitted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only submitted requests can be refused")
    req.status = TimeOffStatus.refused
    db.commit()
    db.refresh(req)
    return _request_response(db, req)


@requests_router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_request(
    request_id: int, db: Session = Depends(db_dependency), user: User = Depends(get_current_active_user)
) -> None:
    req = _get_request_or_404(db, request_id)
    _require_access(user, req)
    if req.status not in (TimeOffStatus.draft, TimeOffStatus.submitted):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft or submitted requests can be deleted")
    db.delete(req)
    db.commit()


# ---------------------------------------------------------------------------
# Balance
# ---------------------------------------------------------------------------


@router.get("/balance", response_model=list[TimeOffBalanceResponse])
def get_balance(
    employee_id: int | None = Query(default=None),
    db: Session = Depends(db_dependency),
    user: User = Depends(get_current_active_user),
) -> list[TimeOffBalanceResponse]:
    if not _is_hr(user):
        employee_id = _own_employee_id_or_403(user)
    elif employee_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="employee_id is required")

    employee = _get_employee_or_400(db, employee_id)
    types = db.query(TimeOffType).filter(TimeOffType.is_active.is_(True)).order_by(TimeOffType.name.asc()).all()

    results: list[TimeOffBalanceResponse] = []
    for time_off_type in types:
        allocated_total, used_total = _balance_for(db, employee_id, time_off_type.id)
        if allocated_total == 0 and used_total == 0:
            continue
        results.append(
            TimeOffBalanceResponse(
                employeeId=str(employee.id),
                employeeName=employee.full_name,
                timeOffTypeId=str(time_off_type.id),
                timeOffTypeName=time_off_type.name,
                allocated=allocated_total,
                used=used_total,
                remaining=allocated_total - used_total,
            )
        )
    return results


# ---------------------------------------------------------------------------
# Dashboard summary (kept at the module root for backward compatibility
# with the existing /time-off dashboard tiles)
# ---------------------------------------------------------------------------


@router.get("/", response_model=TimeOffSummaryResponse, dependencies=[Depends(require_roles(*_READ_ROLES))])
def time_off_summary(db: Session = Depends(db_dependency)) -> TimeOffSummaryResponse:
    today = date.today()

    pending = db.query(TimeOffRequest).filter(TimeOffRequest.status == TimeOffStatus.submitted).count()

    approved_this_month = (
        db.query(TimeOffRequest)
        .filter(
            TimeOffRequest.status == TimeOffStatus.approved,
            extract("year", TimeOffRequest.updated_at) == today.year,
            extract("month", TimeOffRequest.updated_at) == today.month,
        )
        .count()
    )

    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    approved_requests = (
        db.query(TimeOffRequest)
        .filter(
            TimeOffRequest.status == TimeOffStatus.approved,
            TimeOffRequest.start_date <= week_end,
            TimeOffRequest.end_date >= week_start,
        )
        .all()
    )
    days_out_this_week = sum(
        _overlap_days(r.start_date, r.end_date, week_start, week_end) for r in approved_requests
    )

    return TimeOffSummaryResponse(
        pending=pending,
        approved_this_month=approved_this_month,
        days_out_this_week=days_out_this_week,
    )


router.include_router(types_router, prefix="/types", tags=["time-off-types"])
router.include_router(allocations_router, prefix="/allocations", tags=["time-off-allocations"])
router.include_router(requests_router, prefix="/requests", tags=["time-off-requests"])
