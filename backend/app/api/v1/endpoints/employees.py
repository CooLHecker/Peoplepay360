from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db as db_dependency
from app.models import Employee, EmploymentStatus, RoleName

router = APIRouter()

# Only these roles may view or manage the employee directory — a plain
# "employee" account has no business listing everyone in the company.
# Enforced here server-side (never trust the frontend's role check alone).
_STAFF_ROLES = (RoleName.ADMIN, RoleName.HR_MANAGER, RoleName.HR_PAYROLL_ADMIN, RoleName.HR_PAYROLL_USER)


class EmployeePayload(BaseModel):
    full_name: str
    work_email: EmailStr | None = None
    employment_status: str = "active"


def employee_response(employee: Employee) -> dict:
    return {"id": str(employee.id), "fullName": employee.full_name, "departmentId": None, "positionId": None, "employmentStatus": employee.employment_status.value if hasattr(employee.employment_status, "value") else employee.employment_status}


@router.get("/", dependencies=[Depends(require_roles(*_STAFF_ROLES))])
def list_employees(db: Session = Depends(db_dependency)):
    return [employee_response(employee) for employee in db.query(Employee).order_by(Employee.id.desc()).all()]


@router.get("/{employee_id}", dependencies=[Depends(require_roles(*_STAFF_ROLES))])
def get_employee(employee_id: int, db: Session = Depends(db_dependency)):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return employee_response(employee)


@router.post("/", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(*_STAFF_ROLES))])
def create_employee(payload: EmployeePayload, db: Session = Depends(db_dependency)):
    employee = Employee(full_name=payload.full_name, work_email=payload.work_email, employment_status=EmploymentStatus(payload.employment_status))
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee_response(employee)


@router.put("/{employee_id}", dependencies=[Depends(require_roles(*_STAFF_ROLES))])
def update_employee(employee_id: int, payload: EmployeePayload, db: Session = Depends(db_dependency)):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    employee.full_name = payload.full_name
    employee.work_email = payload.work_email
    employee.employment_status = EmploymentStatus(payload.employment_status)
    db.commit()
    db.refresh(employee)
    return employee_response(employee)
