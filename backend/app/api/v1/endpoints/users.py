from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_active_user, require_roles
from app.core.security import hash_password
from app.db.session import get_db as db_dependency
from app.models import Employee, Role, RoleName, User
from app.schemas.users import GrantAccessRequest, RoleOut, UpdateRolesRequest, UserWithRoles

router = APIRouter()

# Deciding who holds which role is a people-management action, not a
# payroll-processing one — scoped to Admin + HR Manager, mirroring the
# "User Management" page in the role-access spec (section 3, "Optional /
# Admin"). Notably this excludes hr_payroll_user / hr_payroll_admin:
# those roles process payroll but don't own access decisions.
_ROLE_MANAGERS = (RoleName.ADMIN, RoleName.HR_MANAGER)


def _user_out(user: User) -> UserWithRoles:
    return UserWithRoles(
        id=user.id,
        email=user.email,
        isActive=user.is_active,
        employeeId=user.employee_id,
        employeeName=user.employee.full_name if user.employee else None,
        roles=[r.name for r in user.roles],
    )


def _resolve_roles(db: Session, role_names: list[str]) -> list[Role]:
    unknown = sorted(set(role_names) - set(RoleName.ALL))
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown role(s): {', '.join(unknown)}",
        )
    roles = db.query(Role).filter(Role.name.in_(role_names)).all()
    if not roles:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Roles are not configured. Run the seed script first.",
        )
    return roles


@router.get("/roles", response_model=list[RoleOut], dependencies=[Depends(require_roles(*_ROLE_MANAGERS))])
def list_roles(db: Session = Depends(db_dependency)) -> list[RoleOut]:
    """All roles that can be granted, for the User Management role picker."""
    roles = db.query(Role).order_by(Role.id).all()
    return [RoleOut(name=r.name, description=r.description) for r in roles]


@router.get("/", response_model=list[UserWithRoles], dependencies=[Depends(require_roles(*_ROLE_MANAGERS))])
def list_users(db: Session = Depends(db_dependency)) -> list[UserWithRoles]:
    users = (
        db.query(User)
        .options(selectinload(User.roles), selectinload(User.employee))
        .order_by(User.id.desc())
        .all()
    )
    return [_user_out(user) for user in users]


@router.patch(
    "/{user_id}/roles",
    response_model=UserWithRoles,
    dependencies=[Depends(require_roles(*_ROLE_MANAGERS))],
)
def update_user_roles(
    user_id: int,
    payload: UpdateRolesRequest,
    db: Session = Depends(db_dependency),
    current_user: User = Depends(get_current_active_user),
) -> UserWithRoles:
    """Promote/demote a user by replacing their full role set.

    A user can't be looked up by non-role-managers (enforced by the
    dependency above), and a role manager can't edit their own roles
    here — self-service promotion, or an HR Manager accidentally
    stripping their own access with no one else around to undo it,
    are exactly what that guard prevents.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own roles. Ask another admin or HR manager.",
        )

    user = (
        db.query(User)
        .options(selectinload(User.roles), selectinload(User.employee))
        .filter(User.id == user_id)
        .first()
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.roles = _resolve_roles(db, payload.role_names)
    db.commit()
    db.refresh(user)
    return _user_out(user)


@router.post(
    "/{employee_id}/grant-access",
    response_model=UserWithRoles,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(*_ROLE_MANAGERS))],
)
def grant_access(
    employee_id: int, payload: GrantAccessRequest, db: Session = Depends(db_dependency)
) -> UserWithRoles:
    """Create a login for an Employee who doesn't have one yet, with an
    initial role — the prerequisite step before that person can be
    promoted, since roles live on User, not on Employee."""
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    if employee.user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="This employee already has login access."
        )
    if not employee.work_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add a work email for this employee before granting login access.",
        )

    roles = _resolve_roles(db, payload.role_names)
    user = User(
        email=employee.work_email.lower(),
        hashed_password=hash_password(payload.password),
        is_active=True,
    )
    user.roles = roles
    user.employee = employee
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_out(user)
