from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str | None = None
    # Revoke every active session for the user (e.g. "log out of all
    # devices"), rather than just the current one.
    all_sessions: bool = False


class UserPublic(BaseModel):
    id: int
    email: str
    employee_id: int | None
    full_name: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    user: UserPublic
    roles: list[str]
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access_token expiry


class AccessTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class MeResponse(BaseModel):
    user: UserPublic
    roles: list[str]
