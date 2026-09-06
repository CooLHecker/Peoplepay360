from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class WorkforceBreakdown(BaseModel):
    """Employment-status counts (app/models/employee.py's real
    EmploymentStatus enum) plus how many of today's active employees
    are on an approved leave — the only breakdown the current data
    model can actually back (there's no full-time/part-time field on
    Employee yet)."""

    active: int
    inactive: int
    terminated: int
    onLeaveToday: int


class PayrollStatus(BaseModel):
    """The current calendar month's payroll position.

    ``status`` is "completed" once payslips exist for this period
    (totalGross is then the real sum of those payslips' gross_salary).
    Otherwise it's "pending" and totalGross is a projection: the sum
    of the wage on whichever contract is currently running for each
    active employee — i.e. what running payroll today would produce,
    mirroring POST /payruns/run's own resolution logic.
    """

    periodLabel: str
    periodYear: int
    periodMonth: int
    totalGross: float
    status: Literal["completed", "pending"]


class RecentActivityItem(BaseModel):
    """One real event pulled from an actual table (a time off
    decision, a payroll run, a new contract, or a new employee) —
    never a placeholder name or made-up timestamp."""

    id: str
    actorName: str
    detail: str
    initials: str
    occurredAt: datetime


class DashboardSummaryResponse(BaseModel):
    totalEmployees: int
    presentToday: int
    lateToday: int
    onLeaveToday: int
    absentToday: int
    pendingTimeOff: int
    attendanceRateThisMonth: float | None
    workforce: WorkforceBreakdown
    payroll: PayrollStatus
    missingDetailsCount: int
    activeWorkingSchedules: int
    recentActivity: list[RecentActivityItem]
