from datetime import datetime, timedelta, timezone

# Attendance is checked in/out at a physical office in India, so
# timestamps are recorded and interpreted in IST (UTC+5:30) rather than
# UTC or "whatever timezone the server happens to run in". A fixed
# offset (no DST in India) keeps this simple and unambiguous.
IST = timezone(timedelta(hours=5, minutes=30), name="IST")


def now_ist() -> datetime:
    """The current wall-clock moment in IST, used as the single source
    of truth for every attendance check-in/check-out timestamp."""
    return datetime.now(IST)


def today_ist():
    """Today's calendar date in IST — the day boundary used for the
    "once per day" check-in/out rule and the admin attendance
    dashboard, so a check-in just after midnight IST correctly counts
    as a new day even if the server itself runs in another timezone."""
    return now_ist().date()


def to_ist(value: datetime | None) -> datetime | None:
    """Normalize a stored attendance timestamp to an IST-aware datetime.

    Every attendance timestamp is written via `now_ist()`, so an
    aware value is simply converted. Some database backends (notably
    SQLite) don't reliably round-trip the UTC offset, so a value that
    comes back tz-naive is assumed to already be IST wall-clock time
    (not UTC) rather than guessing based on the server's local zone.
    """
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=IST)
    return value.astimezone(IST)
