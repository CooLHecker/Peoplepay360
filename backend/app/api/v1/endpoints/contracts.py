from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_roles
from app.db.session import get_db as db_dependency
from app.models import Contract, ContractStatus, Employee, RoleName
from app.schemas.contracts import ContractCreate, ContractResponse, ContractUpdate

router = APIRouter()

# Payroll needs to read contracts (wage) to run payruns, so payroll
# roles get read access even though they don't create/edit contracts.
_READ_ROLES = (RoleName.ADMIN, RoleName.HR_MANAGER, RoleName.HR_PAYROLL_ADMIN, RoleName.HR_PAYROLL_USER)
# Creating/editing contracts is HR-records + payroll-admin territory
# (idea.md section 9: HR Manager owns Contracts; HR Payroll Admin owns
# "Full HR/payroll operations"), not the payroll-processing-only role.
_WRITE_ROLES = (RoleName.ADMIN, RoleName.HR_MANAGER, RoleName.HR_PAYROLL_ADMIN)


def _effective_status(contract: Contract, on: date | None = None) -> str:
    """Derive the contract's real-world status from its dates.

    Only "cancelled" is ever a deliberate, stored action (see
    app/models/contract.py) — draft/running/expired are always
    recomputed against ``on`` (defaults to today) so they never drift
    out of sync with the dates as time passes.
    """
    if contract.status == ContractStatus.cancelled:
        return ContractStatus.cancelled.value
    reference = on or date.today()
    if contract.start_date > reference:
        return ContractStatus.draft.value
    if contract.end_date is not None and contract.end_date < reference:
        return ContractStatus.expired.value
    return ContractStatus.running.value


def _contract_response(contract: Contract) -> ContractResponse:
    return ContractResponse(
        id=str(contract.id),
        employeeId=str(contract.employee_id),
        employeeName=contract.employee.full_name,
        department=contract.department,
        jobPosition=contract.job_position,
        salaryStructureId=contract.salary_structure_id,
        wage=float(contract.wage),
        startDate=contract.start_date,
        endDate=contract.end_date,
        status=_effective_status(contract),
    )


def _get_employee_or_400(db: Session, employee_id: int) -> Employee:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No employee exists with that employee_id.",
        )
    return employee


def _get_contract_or_404(db: Session, contract_id: int) -> Contract:
    contract = (
        db.query(Contract)
        .options(joinedload(Contract.employee))
        .filter(Contract.id == contract_id)
        .first()
    )
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    return contract


@router.get("/", response_model=list[ContractResponse], dependencies=[Depends(require_roles(*_READ_ROLES))])
def list_contracts(
    employee_id: int | None = Query(default=None),
    db: Session = Depends(db_dependency),
) -> list[ContractResponse]:
    query = db.query(Contract).options(joinedload(Contract.employee))
    if employee_id is not None:
        query = query.filter(Contract.employee_id == employee_id)
    contracts = query.order_by(Contract.start_date.desc()).all()
    return [_contract_response(contract) for contract in contracts]


@router.get(
    "/resolve",
    response_model=ContractResponse,
    dependencies=[Depends(require_roles(*_READ_ROLES))],
)
def resolve_active_contract(
    employee_id: int,
    on_date: date = Query(default_factory=date.today),
    db: Session = Depends(db_dependency),
) -> ContractResponse:
    """Resolve the contract applicable to a given date for an employee.

    Per idea.md section G (Payrun workflow, step 4): payroll must not
    blindly use an employee's latest contract, it must resolve the one
    that actually covers the selected payroll period. Matches on
    start_date <= on_date <= end_date (or open-ended), excludes
    cancelled contracts, and — if more than one somehow overlaps —
    prefers the one that started most recently.
    """
    contract = (
        db.query(Contract)
        .options(joinedload(Contract.employee))
        .filter(
            Contract.employee_id == employee_id,
            Contract.status != ContractStatus.cancelled,
            Contract.start_date <= on_date,
        )
        .filter((Contract.end_date.is_(None)) | (Contract.end_date >= on_date))
        .order_by(Contract.start_date.desc())
        .first()
    )
    if contract is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No contract covers that employee for the given date.",
        )
    return _contract_response(contract)


@router.get(
    "/{contract_id}",
    response_model=ContractResponse,
    dependencies=[Depends(require_roles(*_READ_ROLES))],
)
def get_contract(contract_id: int, db: Session = Depends(db_dependency)) -> ContractResponse:
    return _contract_response(_get_contract_or_404(db, contract_id))


@router.post(
    "/",
    response_model=ContractResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(*_WRITE_ROLES))],
)
def create_contract(payload: ContractCreate, db: Session = Depends(db_dependency)) -> ContractResponse:
    _get_employee_or_400(db, payload.employee_id)
    contract = Contract(
        employee_id=payload.employee_id,
        department=payload.department,
        job_position=payload.job_position,
        salary_structure_id=payload.salary_structure_id,
        wage=payload.wage,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return _contract_response(_get_contract_or_404(db, contract.id))


@router.put(
    "/{contract_id}",
    response_model=ContractResponse,
    dependencies=[Depends(require_roles(*_WRITE_ROLES))],
)
def update_contract(
    contract_id: int, payload: ContractUpdate, db: Session = Depends(db_dependency)
) -> ContractResponse:
    contract = _get_contract_or_404(db, contract_id)
    if payload.employee_id != contract.employee_id:
        _get_employee_or_400(db, payload.employee_id)
    contract.employee_id = payload.employee_id
    contract.department = payload.department
    contract.job_position = payload.job_position
    contract.salary_structure_id = payload.salary_structure_id
    contract.wage = payload.wage
    contract.start_date = payload.start_date
    contract.end_date = payload.end_date
    contract.status = ContractStatus.cancelled if payload.cancelled else ContractStatus.running
    db.commit()
    db.refresh(contract)
    return _contract_response(_get_contract_or_404(db, contract.id))


@router.delete(
    "/{contract_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles(*_WRITE_ROLES))],
)
def delete_contract(contract_id: int, db: Session = Depends(db_dependency)) -> None:
    contract = _get_contract_or_404(db, contract_id)
    db.delete(contract)
    db.commit()
