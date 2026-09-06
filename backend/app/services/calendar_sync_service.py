"""Calendar sync for attendance events.

STUBBED, BY DESIGN: there is no Google Workspace / Microsoft Graph OAuth
app registered for this project (no client ID/secret, no token storage,
no `google-api-python-client` or `msal` dependency). Building a fake
"real" integration against either provider without real credentials
would either silently no-op or throw — worse than an honest stub.

This module exists so the rest of the codebase (the attendance service)
never has to change when real credentials show up later: swap the body
of `sync_attendance_event` for a real Google/Microsoft Graph call and
nothing else needs to move.

To wire in the real thing later:
  - Google Workspace: use `google-api-python-client` + a service account
    or OAuth2 flow, call `calendar.events.insert(...)` against the
    employee's calendar.
  - Microsoft Graph: use `msal` for the token, POST to
    `/me/calendar/events` (or `/users/{id}/calendar/events` with an
    app-only token) via `httpx`/`requests`.
Either way, add the client credentials to `.env` / `Settings`
(app/core/config.py) rather than hardcoding them here.
"""

import logging

logger = logging.getLogger("peoplepay.calendar_sync")
logger.setLevel(logging.INFO)
if not logger.handlers:
    # uvicorn's own logging setup (logging.config.dictConfig, run after
    # this module is first imported) can leave loggers outside its own
    # config disabled/unrouted, so this logger gets its own handler
    # rather than relying on root-logger propagation to actually show
    # up in server output.
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    logger.addHandler(_handler)
    logger.propagate = False


def sync_attendance_event(
    *,
    employee_id: int,
    employee_name: str,
    event_type: str,  # "check_in" | "check_out"
    timestamp_iso: str,
) -> bool:
    """Record the intent to sync an attendance event to the employee's
    corporate calendar.

    Returns True to indicate the (stub) sync "succeeded" so callers can
    mark `Attendance.calendar_synced` without needing to know this is a
    stub. Replace the body below with a real API call when credentials
    are available; keep the same signature and return type so nothing
    upstream needs to change.
    """
    logger.info(
        "CALENDAR SYNC (stub): employee_id=%s name=%r event=%s at=%s "
        "— no real API call made (no OAuth credentials configured)",
        employee_id,
        employee_name,
        event_type,
        timestamp_iso,
    )
    return True
