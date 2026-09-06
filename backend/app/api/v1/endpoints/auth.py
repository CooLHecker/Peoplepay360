from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models import User
from app.schemas.auth import (
    AccessTokenResponse,
    LoginRequest,
    LogoutRequest,
    MeResponse,
    RefreshRequest,
    TokenResponse,
    UserPublic,
)
from app.services import auth_service

router = APIRouter()


def _user_public(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        email=user.email,
        employee_id=user.employee_id,
        full_name=user.employee.full_name if user.employee else None,
        is_active=user.is_active,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Online authentication (login flow spec, section 8-10).

    Offline "login" is a client-side concern: the frontend decodes the
    previously-issued access token from local storage/IndexedDB and
    checks its `exp` claim itself — no network call needed, and none
    is exposed here.
    """
    user = auth_service.authenticate_user(db, payload.email, payload.password)
    access_token, refresh_token, expires_in = auth_service.issue_tokens(db, user)

    return TokenResponse(
        user=_user_public(user),
        roles=[r.name for r in user.roles],
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
    )


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> AccessTokenResponse:
    _, access_token, refresh_token, expires_in = auth_service.rotate_refresh_token(
        db, payload.refresh_token
    )
    return AccessTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    payload: LogoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Response:
    """Invalidate the refresh token/session server-side (login flow
    spec, section 22). The access token itself stays valid until it
    naturally expires (it's stateless) — the frontend is responsible
    for discarding it immediately on logout, online or offline."""
    if payload.all_sessions:
        auth_service.revoke_all_sessions(db, current_user)
    elif payload.refresh_token:
        auth_service.revoke_session(db, payload.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_active_user)) -> MeResponse:
    """Used both to resolve the logged-in user's identity/roles for
    the dashboard, and as a lightweight endpoint the frontend can ping
    on reconnect to confirm the cached session is still valid server-side."""
    return MeResponse(
        user=_user_public(current_user),
        roles=[r.name for r in current_user.roles],
    )
