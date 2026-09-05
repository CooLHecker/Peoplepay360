"""Import every model here so Base.metadata sees all tables — required
for Alembic autogenerate and for SQLAlchemy relationship string
lookups (e.g. secondary="user_roles") to resolve correctly."""

from app.models.employee import Employee, EmploymentStatus
from app.models.role import Role, RoleName
from app.models.session import AuthSession
from app.models.user import User, user_roles

__all__ = [
    "Employee",
    "EmploymentStatus",
    "Role",
    "RoleName",
    "AuthSession",
    "User",
    "user_roles",
]
