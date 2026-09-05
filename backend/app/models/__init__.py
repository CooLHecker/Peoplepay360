"""Import every model here so Base.metadata sees all tables — required
for Alembic autogenerate and for SQLAlchemy relationship string
lookups (e.g. secondary="user_roles") to resolve correctly."""

from app.models.contract import Contract, ContractStatus
from app.models.employee import Employee, EmploymentStatus
from app.models.role import Role, RoleName
from app.models.session import AuthSession
from app.models.time_off import (
    TimeOffAllocation,
    TimeOffRequest,
    TimeOffStatus,
    TimeOffType,
    TimeOffWorkEntryBehavior,
)
from app.models.user import User, user_roles
from app.models.working_schedule import WorkingSchedule

__all__ = [
    "Contract",
    "ContractStatus",
    "Employee",
    "EmploymentStatus",
    "Role",
    "RoleName",
    "AuthSession",
    "TimeOffAllocation",
    "TimeOffRequest",
    "TimeOffStatus",
    "TimeOffType",
    "TimeOffWorkEntryBehavior",
    "User",
    "user_roles",
    "WorkingSchedule",
]
