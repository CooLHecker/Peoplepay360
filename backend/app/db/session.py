from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings

settings = get_settings()


def _build_connect_args() -> dict:
    """PyMySQL needs TLS turned on explicitly for managed providers like
    Aiven that require encrypted connections (their URIs carry
    ``ssl-mode=REQUIRED``). ``DATABASE_URL`` query params such as
    ``?ssl-mode=REQUIRED`` are ignored by PyMySQL, so this is driven by
    dedicated settings instead (``db_ssl_required`` / ``db_ssl_ca``).

    Only relevant when DATABASE_URL points at MySQL — a no-op for the
    local SQLite default.
    """
    if not settings.database_url.startswith("mysql"):
        return {}
    if not settings.db_ssl_required:
        return {}

    ssl_opts: dict = {}
    if settings.db_ssl_ca:
        # Full certificate verification against Aiven's CA bundle.
        ssl_opts["ca"] = settings.db_ssl_ca
    # An empty dict still forces PyMySQL to negotiate TLS even with no CA
    # file configured (encryption without hostname/CA verification).
    return {"ssl": ssl_opts}


def _sqlite_connect_args() -> dict:
    # SQLite only hands a connection to one thread by default; FastAPI's
    # dependency-injected session can be used from a different thread than
    # the one that created it, so this needs to be relaxed. Safe here
    # since each request still gets its own Session (see get_db below).
    if settings.database_url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args={**_build_connect_args(), **_sqlite_connect_args()},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
