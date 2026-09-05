from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.security import hash_password
from app.db.session import get_db as db_dependency
from app.models import Employee, EmploymentStatus, Role, RoleName, User
from app.schemas.employees import EmployeeCreate, EmployeeResponse, EmployeeUpdate

router = APIRouter()

# Anyone in one of these roles may view the employee directory.
_READ_ROLES = (RoleName.ADMIN, RoleName.HR_MANAGER, RoleName.HR_PAYROLL_ADMIN, RoleName.HR_PAYROLL_USER)
# Creating/editing/removing employee records is tighter — hr_payroll_user
# is a payroll-processing role, not an HR-records-management one.
_WRITE_ROLES = (RoleName.ADMIN, RoleName.HR_MANAGER, RoleName.HR_PAYROLL_ADMIN)


def _employee_response(employee: Employee) -> EmployeeResponse:
    status_value = employee.employment_status.value if hasattr(employee.employment_status, "value") else employee.employment_status
    return EmployeeResponse(
        id=str(employee.id),
        fullName=employee.full_name,
        workEmail=employee.work_email,
        departmentId=None,
        positionId=None,
        employmentStatus=status_value,
        hasLoginAccess=employee.user is not None,
    )


def _get_employee_or_404(db: Session, employee_id: int) -> Employee:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return employee


@router.get("/", response_model=list[EmployeeResponse], dependencies=[Depends(require_roles(*_READ_ROLES))])
def list_employees(db: Session = Depends(db_dependency)) -> list[EmployeeResponse]:
    employees = db.query(Employee).order_by(Employee.id.desc()).all()
    return [_employee_response(employee) for employee in employees]


@router.get("/{employee_id}", response_model=EmployeeResponse, dependencies=[Depends(require_roles(*_READ_ROLES))])
def get_employee(employee_id: int, db: Session = Depends(db_dependency)) -> EmployeeResponse:
    employee = _get_employee_or_404(db, employee_id)
    return _employee_response(employee)


@router.post(
    "/",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(*_WRITE_ROLES))],
)
def create_employee(payload: EmployeeCreate, db: Session = Depends(db_dependency)) -> EmployeeResponse:
    employee = Employee(
        full_name=payload.full_name,
        work_email=payload.work_email,
        employment_status=EmploymentStatus(payload.employment_status),
    )
    db.add(employee)

    if payload.password:
        # A login needs a unique email to sign in with, and the
        # employee-login flow authenticates by work email — so require
        # one here rather than silently creating an unreachable account.
        if not payload.work_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A work email is required to create login access.",
            )
        employee_role = db.query(Role).filter(Role.name == RoleName.EMPLOYEE).first()
        if employee_role is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="The employee role is not configured. Run the seed script first.",
            )
        user = User(
            email=payload.work_email.lower(),
            hashed_password=hash_password(payload.password),
            is_active=True,
        )
        user.roles.append(employee_role)
        # Assigning via the relationship (rather than setting
        # employee_id directly) lets SQLAlchemy insert both rows in
        # one flush, in the right order, without needing the
        # employee's id up front.
        user.employee = employee
        db.add(user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An employee or login with this work email already exists.",
        )
    db.refresh(employee)
    return _employee_response(employee)


@router.put(
    "/{employee_id}",
    response_model=EmployeeResponse,
    dependencies=[Depends(require_roles(*_WRITE_ROLES))],
)
def update_employee(employee_id: int, payload: EmployeeUpdate, db: Session = Depends(db_dependency)) -> EmployeeResponse:
    employee = _get_employee_or_404(db, employee_id)
    employee.full_name = payload.full_name
    employee.work_email = payload.work_email
    if payload.employment_status is not None:
        employee.employment_status = EmploymentStatus(payload.employment_status)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An employee with this work email already exists.",
        )
    db.refresh(employee)
    return _employee_response(employee)


@router.delete(
    "/{employee_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles(*_WRITE_ROLES))],
)
def delete_employee(employee_id: int, db: Session = Depends(db_dependency)) -> None:
    employee = _get_employee_or_404(db, employee_id)
    # The FK from users.employee_id is ON DELETE SET NULL (enforced via
    # the SQLite foreign_keys pragma turned on in app/db/session.py), so
    # any linked login account survives with employee_id cleared rather
    # than becoming a dangling reference.
    db.delete(employee)
    db.commit()
