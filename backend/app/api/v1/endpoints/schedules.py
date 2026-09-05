from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db as db_dependency
from app.models import RoleName, WorkingSchedule
from app.schemas.schedules import (
    WorkingScheduleCreate,
    WorkingScheduleResponse,
    WorkingScheduleUpdate,
)

router = APIRouter()

# Every HR/payroll role needs to see the available working patterns
# (e.g. to display or assign one against an employee/contract), so
# read access is as broad as employees/contracts.
_READ_ROLES = (RoleName.ADMIN, RoleName.HR_MANAGER, RoleName.HR_PAYROLL_ADMIN, RoleName.HR_PAYROLL_USER)
# Defining/editing the patterns themselves is HR-records + admin
# territory, same split as Contracts (idea.md section 9).
_WRITE_ROLES = (RoleName.ADMIN, RoleName.HR_MANAGER, RoleName.HR_PAYROLL_ADMIN)


def _schedule_response(schedule: WorkingSchedule) -> WorkingScheduleResponse:
    return WorkingScheduleResponse(
        id=str(schedule.id),
        name=schedule.name,
        description=schedule.description,
        isFlexible=schedule.is_flexible,
        hoursPerWeek=float(schedule.hours_per_week),
        daysPerWeek=schedule.days_per_week,
        startTime=schedule.start_time,
        endTime=schedule.end_time,
        timezone=schedule.timezone,
        isActive=schedule.is_active,
    )


def _get_schedule_or_404(db: Session, schedule_id: int) -> WorkingSchedule:
    schedule = db.get(WorkingSchedule, schedule_id)
    if schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Working schedule not found")
    return schedule


def _apply_payload(schedule: WorkingSchedule, payload: WorkingScheduleCreate | WorkingScheduleUpdate) -> None:
    schedule.name = payload.name
    schedule.description = payload.description
    schedule.is_flexible = payload.is_flexible
    schedule.hours_per_week = payload.hours_per_week
    schedule.days_per_week = payload.days_per_week
    schedule.start_time = payload.start_time
    schedule.end_time = payload.end_time
    schedule.timezone = payload.timezone
    schedule.is_active = payload.is_active


@router.get("/", response_model=list[WorkingScheduleResponse], dependencies=[Depends(require_roles(*_READ_ROLES))])
def list_schedules(
    include_inactive: bool = Query(default=False, description="Include retired (is_active=false) schedules"),
    db: Session = Depends(db_dependency),
) -> list[WorkingScheduleResponse]:
    query = db.query(WorkingSchedule)
    if not include_inactive:
        query = query.filter(WorkingSchedule.is_active.is_(True))
    schedules = query.order_by(WorkingSchedule.name.asc()).all()
    return [_schedule_response(schedule) for schedule in schedules]


@router.get(
    "/{schedule_id}",
    response_model=WorkingScheduleResponse,
    dependencies=[Depends(require_roles(*_READ_ROLES))],
)
def get_schedule(schedule_id: int, db: Session = Depends(db_dependency)) -> WorkingScheduleResponse:
    return _schedule_response(_get_schedule_or_404(db, schedule_id))


@router.post(
    "/",
    response_model=WorkingScheduleResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(*_WRITE_ROLES))],
)
def create_schedule(payload: WorkingScheduleCreate, db: Session = Depends(db_dependency)) -> WorkingScheduleResponse:
    schedule = WorkingSchedule()
    _apply_payload(schedule, payload)
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return _schedule_response(schedule)


@router.put(
    "/{schedule_id}",
    response_model=WorkingScheduleResponse,
    dependencies=[Depends(require_roles(*_WRITE_ROLES))],
)
def update_schedule(
    schedule_id: int, payload: WorkingScheduleUpdate, db: Session = Depends(db_dependency)
) -> WorkingScheduleResponse:
    schedule = _get_schedule_or_404(db, schedule_id)
    _apply_payload(schedule, payload)
    db.commit()
    db.refresh(schedule)
    return _schedule_response(schedule)


@router.delete(
    "/{schedule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles(*_WRITE_ROLES))],
)
def delete_schedule(schedule_id: int, db: Session = Depends(db_dependency)) -> None:
    # Hard delete: nothing references working_schedules by FK yet
    # (see app/models/working_schedule.py) so there's no orphan risk.
    # is_active exists for the "retire without losing history" case
    # once Employee/Contract do link to this table.
    schedule = _get_schedule_or_404(db, schedule_id)
    db.delete(schedule)
    db.commit()
