import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()

# Hashing is done with `bcrypt` directly rather than via passlib.
# passlib (last released 2020, effectively unmaintained) detects its
# bcrypt backend by reading `bcrypt.__about__.__version__`, an
# attribute bcrypt >=4.1 removed — this makes passlib misdetect the
# backend and fail with a misleading "password cannot be longer than
# 72 bytes" error even for short passwords. Calling bcrypt directly
# sidesteps that entirely.
_BCRYPT_MAX_BYTES = 72  # bcrypt silently ignores bytes beyond this


def hash_password(password: str) -> str:
    truncated = password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(truncated, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    truncated = plain_password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    try:
        return bcrypt.checkpw(truncated, hashed_password.encode("utf-8"))
    except ValueError:
        # Malformed/foreign hash format in the DB — treat as no match
        # rather than raising a 500 back through the login endpoint.
        return False


def create_access_token(subject: str, expires_minutes: int | None = None) -> tuple[str, datetime]:
    """Create a short-lived access JWT. Returns (token, expiry) so the
    caller can report `expires_in` without decoding the token again."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.access_token_expire_minutes
    )
    payload = {"sub": subject, "exp": expire, "type": "access"}
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, expire


def decode_access_token(token: str) -> dict | None:
    """Decode + validate an access JWT. Returns None on any failure
    (expired, bad signature, wrong token type) rather than raising, so
    callers can turn every failure into one generic 401."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
    if payload.get("type") != "access":
        return None
    return payload


def generate_refresh_token() -> str:
    """Refresh tokens are opaque random strings (not JWTs) so they can
    be revoked server-side just by deleting/marking their DB row."""
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
