"""AI-powered employee assistant, backed by Google's Gemini API.

Replaces the old frontend chatbot, which just lowercased the question
and matched it against four hardcoded keywords ("leave", "maternity",
"sick", "payroll") to pick one of four hardcoded canned answers -
anything else always got the same generic fallback, and the payroll
answer even had an August 2026 / ₹1,28,400 figure baked into the
string regardless of who was asking.

This endpoint instead calls Gemini server-side (the API key lives only
in this process's environment, never in the browser) and grounds its
reply in the caller's OWN real data - leave balance, latest payslip,
current contract, today's attendance - read fresh from the database on
every request, the same way the rest of this employee's dashboard is.
Nothing about any other employee is ever included in the prompt.
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.core.config import get_settings
from app.core.timezone import today_ist
from app.db.session import get_db as db_dependency
from app.models import (
    Attendance,
    Contract,
    ContractStatus,
    Payslip,
    TimeOffAllocation,
    TimeOffRequest,
    TimeOffStatus,
    TimeOffType,
    User,
)
from app.schemas.chat import ChatAskRequest, ChatAskResponse

router = APIRouter()

_GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

_SYSTEM_PROMPT = """You are "PeoplePay assistant", a helpful HR chatbot embedded in an \
employee's self-service dashboard.

Rules:
- Answer only using the "Employee context" block below, which reflects this employee's \
own real, current records. Never invent numbers, dates, or policies that aren't in it.
- You can help with: leave/time-off balance and requests, payslips and payroll, today's \
attendance, and this employee's contract.
- If the answer isn't in the context, or the question is outside HR topics, say you don't \
have that information and suggest contacting People Operations. Never discuss or speculate \
about any other employee.
- Keep replies short and conversational: 2-4 sentences, no markdown headings or bullet lists \
unless the employee is asking for several distinct items.
"""

# Keep the round trip snappy for a chat widget.
_REQUEST_TIMEOUT_SECONDS = 20.0
_MAX_OUTPUT_TOKENS = 400


def _build_employee_context(db: Session, user: User) -> str:
    if user.employee_id is None:
        return "This account has no linked employee record, so no HR data is available."

    employee_id = user.employee_id
    lines: list[str] = []

    # --- Contract -----------------------------------------------------
    contract = (
        db.query(Contract)
        .filter(Contract.employee_id == employee_id)
        .order_by(Contract.start_date.desc())
        .first()
    )
    if contract:
        status_label = "cancelled" if contract.status == ContractStatus.cancelled else contract.status.value
        lines.append(
            f"- Contract: {contract.job_position or 'role not set'}"
            f"{f' in {contract.department}' if contract.department else ''}, "
            f"status {status_label}, started {contract.start_date.isoformat()}, "
            f"monthly wage {contract.wage}."
        )
    else:
        lines.append("- Contract: none on file yet.")

    # --- Payroll --------------------------------------------------------
    latest_payslip = (
        db.query(Payslip)
        .filter(Payslip.employee_id == employee_id)
        .order_by(Payslip.period_year.desc(), Payslip.period_month.desc())
        .first()
    )
    if latest_payslip:
        lines.append(
            f"- Latest payslip: {latest_payslip.period_month:02d}/{latest_payslip.period_year}, "
            f"net salary {latest_payslip.net_salary}, status {latest_payslip.status.value}."
        )
    else:
        lines.append("- Payslips: none generated yet.")

    # --- Leave balance, per active time off type -------------------------
    # Mirrors the balance rule elsewhere in the app (only approved
    # allocations grant days, only approved requests consume them),
    # simplified here to a running total per type rather than a
    # date-bounded ledger, which is enough for a chat answer.
    allocated_by_type = dict(
        db.query(TimeOffAllocation.time_off_type_id, func.sum(TimeOffAllocation.allocated_days))
        .filter(
            TimeOffAllocation.employee_id == employee_id,
            TimeOffAllocation.status == TimeOffStatus.approved,
        )
        .group_by(TimeOffAllocation.time_off_type_id)
        .all()
    )
    used_by_type = dict(
        db.query(TimeOffRequest.time_off_type_id, func.sum(TimeOffRequest.number_of_days))
        .filter(
            TimeOffRequest.employee_id == employee_id,
            TimeOffRequest.status == TimeOffStatus.approved,
        )
        .group_by(TimeOffRequest.time_off_type_id)
        .all()
    )
    type_ids = set(allocated_by_type) | set(used_by_type)
    if type_ids:
        types_by_id = {t.id: t for t in db.query(TimeOffType).filter(TimeOffType.id.in_(type_ids)).all()}
        lines.append("- Leave balances:")
        for type_id in type_ids:
            allocated = float(allocated_by_type.get(type_id, 0) or 0)
            used = float(used_by_type.get(type_id, 0) or 0)
            type_name = types_by_id[type_id].name if type_id in types_by_id else "Leave"
            lines.append(f"  - {type_name}: {allocated - used} days remaining ({allocated} allocated, {used} used).")
    else:
        lines.append("- Leave balances: no allocations on file.")

    # --- Recent time off requests ----------------------------------------
    recent_requests = (
        db.query(TimeOffRequest)
        .filter(TimeOffRequest.employee_id == employee_id)
        .order_by(TimeOffRequest.start_date.desc())
        .limit(5)
        .all()
    )
    if recent_requests:
        lines.append("- Recent time off requests:")
        for req in recent_requests:
            lines.append(
                f"  - {req.time_off_type.name}: {req.start_date.isoformat()} to "
                f"{req.end_date.isoformat()} ({req.number_of_days} days), status {req.status.value}."
            )
    else:
        lines.append("- Recent time off requests: none.")

    # --- Today's attendance ----------------------------------------------
    todays_attendance = (
        db.query(Attendance)
        .filter(Attendance.employee_id == employee_id)
        .order_by(Attendance.check_in_at.desc())
        .first()
    )
    if todays_attendance:
        lines.append(
            f"- Most recent attendance record: checked in {todays_attendance.check_in_at.isoformat()}, "
            f"status {todays_attendance.status.value}"
            + (f", checked out {todays_attendance.check_out_at.isoformat()}" if todays_attendance.check_out_at else "")
            + "."
        )
    else:
        lines.append("- Attendance: no records yet.")

    return "\n".join(lines)


async def _call_gemini(system_prompt: str, contents: list[dict]) -> str:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The assistant isn't configured yet — set GEMINI_API_KEY in the backend's .env file.",
        )

    url = _GEMINI_ENDPOINT.format(model=settings.gemini_model)
    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {"maxOutputTokens": _MAX_OUTPUT_TOKENS, "temperature": 0.3},
    }

    try:
        async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(
                url,
                params={"key": settings.gemini_api_key},
                json=payload,
            )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The assistant took too long to respond. Please try again.",
        )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach the assistant right now. Please try again shortly.",
        )

    if response.status_code == status.HTTP_401_UNAUTHORIZED or response.status_code == status.HTTP_403_FORBIDDEN:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The assistant's Gemini API key was rejected — check GEMINI_API_KEY in the backend's .env file.",
        )
    if response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="The assistant is getting a lot of requests right now. Please try again in a moment.",
        )
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The assistant couldn't process that question. Please try again.",
        )

    data = response.json()
    candidates = data.get("candidates") or []
    if not candidates:
        block_reason = (data.get("promptFeedback") or {}).get("blockReason")
        if block_reason:
            return "I can't help with that question. Feel free to ask about your leave, payroll, attendance, or contract instead."
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The assistant didn't return a response. Please try again.",
        )

    parts = (candidates[0].get("content") or {}).get("parts") or []
    reply = "".join(part.get("text", "") for part in parts).strip()
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The assistant didn't return a response. Please try again.",
        )
    return reply


@router.post("/ask", response_model=ChatAskResponse)
async def ask_assistant(
    payload: ChatAskRequest,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(db_dependency),
) -> ChatAskResponse:
    employee_context = _build_employee_context(db, user)
    system_prompt = f"{_SYSTEM_PROMPT}\nEmployee context (today is {today_ist().isoformat()}):\n{employee_context}"

    # Gemini's "contents" turns use role "user" / "model" — map the
    # frontend's "bot" onto "model" and cap history length server-side
    # too, in case a future caller doesn't respect the schema's limit.
    contents = [
        {"role": "user" if message.from_ == "user" else "model", "parts": [{"text": message.text}]}
        for message in payload.history[-10:]
    ]
    contents.append({"role": "user", "parts": [{"text": payload.message}]})

    reply = await _call_gemini(system_prompt, contents)
    return ChatAskResponse(reply=reply)
