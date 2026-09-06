from pydantic import BaseModel, Field


class RoleOut(BaseModel):
    name: str
    description: str | None = None


class UserWithRoles(BaseModel):
    id: int
    email: str
    isActive: bool
    employeeId: int | None = None
    employeeName: str | None = None
    roles: list[str]


class UpdateRolesRequest(BaseModel):
    # At least one role is required — an account with zero roles can log
    # in but reaches every `require_roles(...)`-gated endpoint as a 403,
    # which is a confusing dead-end state rather than a useful demotion.
    role_names: list[str] = Field(min_length=1)


class GrantAccessRequest(BaseModel):
    """Creates a login (User row) for an Employee who doesn't have one
    yet, so they can be assigned roles and sign in. Mirrors the login
    creation embedded in EmployeeCreate, but usable after the fact from
    the User Management screen."""

    password: str = Field(min_length=8, max_length=72)
    role_names: list[str] = Field(default_factory=lambda: ["employee"], min_length=1)
