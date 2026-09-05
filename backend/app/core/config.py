from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PeoplePay Offline API"
    database_url: str = "mysql+pymysql://user:password@localhost:3306/peoplepay"
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

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
