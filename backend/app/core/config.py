from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PeoplePay Offline API"
    # Local dev default: a SQLite file in the backend/ folder — zero setup,
    # no server/service to run. Override with DATABASE_URL in .env to point
    # at MySQL/Postgres/Aiven etc. instead.
    database_url: str = "sqlite:///./peoplepay.db"
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    cors_origins: str = "http://localhost:5173"

    # Managed MySQL providers (Aiven, PlanetScale, etc.) require TLS.
    # PyMySQL ignores ssl-mode query params in the URL, so this is
    # handled via connect_args in app/db/session.py instead.
    db_ssl_required: bool = False
    db_ssl_ca: str | None = None  # optional path to a CA bundle (e.g. ca.pem)

    # Only consumed by `python -m app.db.seed` (see app/db/seed.py) to
    # create the very first Admin account and a demo Employee account,
    # since there's no User Management screen yet to do this through.
    # Read via this Settings class (not os.environ) so they actually
    # pick up values from .env — os.environ.get() alone won't see
    # .env-file values, since pydantic-settings loads the file itself
    # without exporting it to the real process environment.
    bootstrap_admin_email: str | None = None
    bootstrap_admin_password: str | None = None
    demo_employee_email: str | None = None
    demo_employee_password: str | None = None
    demo_employee_name: str = "Demo Employee"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
