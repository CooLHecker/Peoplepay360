from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
    verify_password,
)
from app.models import AuthSession, RoleName, User

settings = get_settings()

# Deliberately generic on every failure path below, so the API never
# reveals whether a given email is a real account (login flow spec,
# section 9: "Do not expose whether a particular account exists").
GENERIC_LOGIN_ERROR = "Unable to sign in. Please check your email and password."


def _get_user_by_email(db: Session, email: str) -> User | None:
    return (
        db.query(User)
        .options(selectinload(User.roles))
        .filter(User.email == email.lower())
        .first()
    )


def authenticate_user(db: Session, email: str, password: str) -> User:
    """Validate credentials per login flow spec section 8-9:
    user exists, account active, password valid, linked to an employee
    (unless a pure Admin account), and has at least one assigned role.
    """
    user = _get_user_by_email(db, email)

    if user is None or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_LOGIN_ERROR)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_LOGIN_ERROR)

    role_names = {r.name for r in user.roles}
    if not role_names:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_LOGIN_ERROR)

    is_pure_admin = role_names == {RoleName.ADMIN}
    if user.employee_id is None and not is_pure_admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_LOGIN_ERROR)

    return user


def issue_tokens(db: Session, user: User) -> tuple[str, str, int]:
    """Issue a new access/refresh token pair and persist the refresh
    token's hash as a new AuthSession row."""
    access_token, expire = create_access_token(subject=str(user.id))
    refresh_token = generate_refresh_token()

    session = AuthSession(
        user_id=user.id,
        refresh_token_hash=hash_refresh_token(refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(session)
    db.commit()

    expires_in = int((expire - datetime.now(timezone.utc)).total_seconds())
    return access_token, refresh_token, expires_in


def rotate_refresh_token(db: Session, refresh_token: str) -> tuple[User, str, str, int]:
    """Validate a refresh token, revoke it, and issue a fresh pair
    (rotation: a used-up refresh token can never be replayed)."""
    invalid_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token"
    )

    token_hash = hash_refresh_token(refresh_token)
    session = db.query(AuthSession).filter(AuthSession.refresh_token_hash == token_hash).first()

    if session is None or not session.is_active:
        raise invalid_error

    user = db.get(User, session.user_id, options=[selectinload(User.roles)])
    if user is None or not user.is_active:
        raise invalid_error

    session.revoked_at = datetime.now(timezone.utc)
    db.add(session)

    access_token, refresh_token_new, expires_in = issue_tokens(db, user)
    return user, access_token, refresh_token_new, expires_in


def revoke_session(db: Session, refresh_token: str) -> None:
    token_hash = hash_refresh_token(refresh_token)
    session = db.query(AuthSession).filter(AuthSession.refresh_token_hash == token_hash).first()
    if session is not None and session.is_active:
        session.revoked_at = datetime.now(timezone.utc)
        db.add(session)
        db.commit()


def revoke_all_sessions(db: Session, user: User) -> None:
    db.query(AuthSession).filter(
        AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None)
    ).update({"revoked_at": datetime.now(timezone.utc)})
    db.commit()
