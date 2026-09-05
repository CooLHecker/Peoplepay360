from typing import Literal

from pydantic import BaseModel, EmailStr, Field

EmploymentStatusLiteral = Literal["active", "inactive", "terminated"]


class EmployeeCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    work_email: EmailStr | None = None
    employment_status: EmploymentStatusLiteral = "active"
    # Optional: when set, a linked login (User, role "employee") is
    # created in the same transaction so the employee can immediately
    # sign in at /employee-login with work_email + this password.
    # Requires work_email to be set (validated in the endpoint, since
    # that check needs both fields together).
    password: str | None = Field(default=None, min_length=8, max_length=72)


class EmployeeUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    work_email: EmailStr | None = None
    # No default here (unlike EmployeeCreate) — the edit form doesn't
    # send this field, and defaulting it to "active" would silently
    # reset an inactive/terminated employee back to active on every save.
    employment_status: EmploymentStatusLiteral | None = None


class EmployeeResponse(BaseModel):
    id: str
    fullName: str
    workEmail: str | None = None
    departmentId: str | None = None
    positionId: str | None = None
    employmentStatus: EmploymentStatusLiteral
    # Whether a login (User row) is already linked to this employee —
    # lets the frontend show login status and avoid offering to create
    # a second account for the same person.
    hasLoginAccess: bool = False
