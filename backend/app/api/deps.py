from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, selectinload

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User

bearer_scheme = HTTPBearer(auto_error=False)

_CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise _CREDENTIALS_ERROR

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise _CREDENTIALS_ERROR

    user_id = payload.get("sub")
    if user_id is None:
        raise _CREDENTIALS_ERROR

    user = db.get(User, int(user_id), options=[selectinload(User.roles)])
    if user is None:
        raise _CREDENTIALS_ERROR

    return user


def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive account")
    return user


def require_roles(*allowed_roles: str):
    """Dependency factory for server-side role enforcement.

    Roles are always read fresh from `user.roles` (a DB relationship
    loaded in this same request) — never from a client-supplied value
    and never assumed from JWT claims — per the login flow's rule that
    the frontend-supplied role must never be trusted as proof of
    authorization. Use on every endpoint outside /auth that should be
    restricted to specific roles, e.g.:

        @router.get("/", dependencies=[Depends(require_roles(RoleName.ADMIN))])
    """

    def dependency(user: User = Depends(get_current_active_user)) -> User:
        user_role_names = {r.name for r in user.roles}
        if not user_role_names.intersection(allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return user

    return dependency
