from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

PayslipStatusLiteral = Literal["generated", "paid"]


class PayslipResponse(BaseModel):
    id: str
    employeeId: str
    employeeName: str
    contractId: str | None = None
    periodYear: int
    periodMonth: int
    period: str
    grossSalary: float
    netSalary: float
    status: PayslipStatusLiteral
    generatedAt: datetime


class RunPayrollRequest(BaseModel):
    # Defaults to the current calendar month when omitted.
    period_year: int | None = Field(default=None, ge=2000, le=2100)
    period_month: int | None = Field(default=None, ge=1, le=12)

    @model_validator(mode="after")
    def _both_or_neither(self) -> "RunPayrollRequest":
        if (self.period_year is None) != (self.period_month is None):
            raise ValueError("period_year and period_month must be provided together")
        return self


class RunPayrollResult(BaseModel):
    periodYear: int
    periodMonth: int
    period: str
    generated: int
    skippedNoContract: int
    skippedAlreadyExists: int
    totalGross: float


class PayrunSummary(BaseModel):
    id: str
    period: str
    periodYear: int
    periodMonth: int
    employees: int
    gross: float
    status: Literal["Completed"]
