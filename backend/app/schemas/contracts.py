from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator

ContractStatusLiteral = Literal["draft", "running", "expired", "cancelled"]


class ContractBase(BaseModel):
    employee_id: int
    department: str | None = Field(default=None, max_length=255)
    job_position: str | None = Field(default=None, max_length=255)
    salary_structure_id: str | None = Field(default=None, max_length=255)
    wage: float = Field(gt=0)
    start_date: date
    # NULL/omitted = open-ended contract.
    end_date: date | None = None

    @model_validator(mode="after")
    def _check_dates(self) -> "ContractBase":
        if self.end_date is not None and self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")
        return self


class ContractCreate(ContractBase):
    pass


class ContractUpdate(ContractBase):
    # Editing a contract can also explicitly cancel it — the one
    # status value that's a deliberate action rather than derived
    # from dates (see app/models/contract.py).
    cancelled: bool = False


class ContractResponse(BaseModel):
    id: str
    employeeId: str
    employeeName: str
    department: str | None = None
    jobPosition: str | None = None
    salaryStructureId: str | None = None
    wage: float
    startDate: date
    endDate: date | None = None
    status: ContractStatusLiteral
