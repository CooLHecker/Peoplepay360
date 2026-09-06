from datetime import date, datetime

from pydantic import BaseModel, Field


class AttendanceCheckRequest(BaseModel):
    """Coordinates captured client-side via the browser Geolocation API.

    Only latitude/longitude are accepted from the client — no
    client-supplied timestamp field exists here, since the server clock
    (`func.now()` on the model) is the only timestamp source of truth,
    per the attendance spec.
    """

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class AttendanceResponse(BaseModel):
    id: str
    status: str
    checkInAt: datetime
    checkInDistanceM: float
    checkOutAt: datetime | None = None
    checkOutDistanceM: float | None = None
    calendarSynced: bool

    model_config = {"from_attributes": True}


class AttendanceAdminRow(BaseModel):
    """One employee's row on the admin Attendance dashboard, built from
    that employee's real (if any) attendance record for `date` — never
    hardcoded/mock data."""

    employeeId: str
    fullName: str
    workEmail: str | None = None
    checkInAt: datetime | None = None
    checkOutAt: datetime | None = None
    status: str  # "present" | "late" | "on_leave" | "absent"


class AttendanceSummaryResponse(BaseModel):
    """Backs the admin Attendance dashboard (AttendancePage.tsx): the
    per-employee rows plus the counts shown in the metric cards above
    the table, both derived from the same real records so the two can
    never disagree."""

    date: date
    present: int
    late: int
    onLeave: int
    absent: int
    rows: list[AttendanceAdminRow]
