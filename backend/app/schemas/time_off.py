from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator

TimeOffStatusLiteral = Literal["draft", "submitted", "approved", "refused"]
WorkEntryBehaviorLiteral = Literal["paid", "unpaid"]


# ---------------------------------------------------------------------------
# Time Off Types
# ---------------------------------------------------------------------------


class TimeOffTypeBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    requires_allocation: bool = True
    work_entry_behavior: WorkEntryBehaviorLiteral = "paid"
    is_active: bool = True


class TimeOffTypeCreate(TimeOffTypeBase):
    pass


class TimeOffTypeUpdate(TimeOffTypeBase):
    pass


class TimeOffTypeResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    requiresAllocation: bool
    workEntryBehavior: WorkEntryBehaviorLiteral
    isActive: bool


# ---------------------------------------------------------------------------
# Allocations
# ---------------------------------------------------------------------------


class TimeOffAllocationBase(BaseModel):
    employee_id: int
    time_off_type_id: int
    allocated_days: float = Field(gt=0, le=365)
    start_date: date
    # NULL/omitted = never expires.
    end_date: date | None = None
    notes: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _check_dates(self) -> "TimeOffAllocationBase":
        if self.end_date is not None and self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")
        return self


class TimeOffAllocationCreate(TimeOffAllocationBase):
    pass


class TimeOffAllocationUpdate(TimeOffAllocationBase):
    pass


class TimeOffAllocationResponse(BaseModel):
    id: str
    employeeId: str
    employeeName: str
    timeOffTypeId: str
    timeOffTypeName: str
    allocatedDays: float
    usedDays: float
    remainingDays: float
    startDate: date
    endDate: date | None = None
    status: TimeOffStatusLiteral
    notes: str | None = None


# ---------------------------------------------------------------------------
# Requests
# ---------------------------------------------------------------------------


class TimeOffRequestBase(BaseModel):
    # Optional: an employee submitting their own request never has to
    # supply it (the endpoint fills in their own employee_id and
    # rejects any mismatching value); HR/admin creating on someone
    # else's behalf must supply it.
    employee_id: int | None = None
    time_off_type_id: int
    start_date: date
    end_date: date
    reason: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def _check_dates(self) -> "TimeOffRequestBase":
        if self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")
        return self


class TimeOffRequestCreate(TimeOffRequestBase):
    # A request can be saved as a draft before it's submitted for
    # approval (corrections.md section 30: Draft -> Submitted -> ...).
    save_as_draft: bool = False


class TimeOffRequestUpdate(TimeOffRequestBase):
    pass


class TimeOffRequestDecision(BaseModel):
    """Optional note attached to an approve/refuse decision."""

    notes: str | None = Field(default=None, max_length=500)


class TimeOffRequestResponse(BaseModel):
    id: str
    employeeId: str
    employeeName: str
    timeOffTypeId: str
    timeOffTypeName: str
    startDate: date
    endDate: date
    numberOfDays: float
    reason: str | None = None
    availableBalance: float | None = None
    status: TimeOffStatusLiteral


# ---------------------------------------------------------------------------
# Balance / dashboard
# ---------------------------------------------------------------------------


class TimeOffBalanceResponse(BaseModel):
    employeeId: str
    employeeName: str
    timeOffTypeId: str
    timeOffTypeName: str
    allocated: float
    used: float
    remaining: float


class TimeOffSummaryResponse(BaseModel):
    pending: int
    approved_this_month: int
    days_out_this_week: float
