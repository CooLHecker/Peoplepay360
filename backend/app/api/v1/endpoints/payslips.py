import calendar
import io

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_active_user
from app.db.session import get_db as db_dependency
from app.models import Payslip, RoleName, User
from app.schemas.payroll import PayslipResponse

router = APIRouter()

# Anyone with one of these roles can see every employee's payslips.
# Everyone else (plain "employee" role) can only ever see their own.
_PAYROLL_READ_ROLES = {
    RoleName.ADMIN,
    RoleName.HR_MANAGER,
    RoleName.HR_PAYROLL_ADMIN,
    RoleName.HR_PAYROLL_USER,
}


def _period_label(year: int, month: int) -> str:
    return f"{calendar.month_name[month]} {year}"


def _payslip_response(payslip: Payslip) -> PayslipResponse:
    return PayslipResponse(
        id=str(payslip.id),
        employeeId=str(payslip.employee_id),
        employeeName=payslip.employee.full_name,
        contractId=str(payslip.contract_id) if payslip.contract_id else None,
        periodYear=payslip.period_year,
        periodMonth=payslip.period_month,
        period=_period_label(payslip.period_year, payslip.period_month),
        grossSalary=float(payslip.gross_salary),
        netSalary=float(payslip.net_salary),
        status=payslip.status.value,
        generatedAt=payslip.generated_at,
    )


def _get_payslip_or_404(db: Session, payslip_id: int) -> Payslip:
    payslip = (
        db.query(Payslip)
        .options(joinedload(Payslip.employee))
        .filter(Payslip.id == payslip_id)
        .first()
    )
    if payslip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payslip not found")
    return payslip


def _assert_can_view(user: User, payslip: Payslip) -> None:
    """Payroll roles see everyone; a plain employee only ever sees
    their own payslips (matched via their linked Employee record) —
    never trusting a client-supplied employee_id for that check."""
    role_names = {r.name for r in user.roles}
    if role_names & _PAYROLL_READ_ROLES:
        return
    if user.employee_id is not None and user.employee_id == payslip.employee_id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to view this payslip",
    )


@router.get("/", response_model=list[PayslipResponse])
def list_payslips(
    employee_id: int | None = Query(default=None),
    db: Session = Depends(db_dependency),
    user: User = Depends(get_current_active_user),
) -> list[PayslipResponse]:
    role_names = {r.name for r in user.roles}
    is_payroll = bool(role_names & _PAYROLL_READ_ROLES)

    query = db.query(Payslip).options(joinedload(Payslip.employee))

    if is_payroll:
        if employee_id is not None:
            query = query.filter(Payslip.employee_id == employee_id)
    else:
        # Non-payroll users can only ever list their own payslips,
        # regardless of what employee_id (if any) was requested.
        if user.employee_id is None:
            return []
        query = query.filter(Payslip.employee_id == user.employee_id)

    payslips = query.order_by(Payslip.period_year.desc(), Payslip.period_month.desc()).all()
    return [_payslip_response(p) for p in payslips]


@router.get("/{payslip_id}", response_model=PayslipResponse)
def get_payslip(
    payslip_id: int,
    db: Session = Depends(db_dependency),
    user: User = Depends(get_current_active_user),
) -> PayslipResponse:
    payslip = _get_payslip_or_404(db, payslip_id)
    _assert_can_view(user, payslip)
    return _payslip_response(payslip)


@router.get("/{payslip_id}/pdf")
def download_payslip_pdf(
    payslip_id: int,
    db: Session = Depends(db_dependency),
    user: User = Depends(get_current_active_user),
) -> StreamingResponse:
    payslip = _get_payslip_or_404(db, payslip_id)
    _assert_can_view(user, payslip)

    pdf_bytes = _render_payslip_pdf(payslip)
    filename = f"payslip-{payslip.employee.full_name.replace(' ', '_')}-{payslip.period_year}-{payslip.period_month:02d}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _render_payslip_pdf(payslip: Payslip) -> bytes:
    """Render a simple one-page payslip as PDF bytes using reportlab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    left = 20 * mm
    y = height - 25 * mm

    c.setFont("Helvetica-Bold", 18)
    c.drawString(left, y, "PeoplePay")
    y -= 8 * mm
    c.setFont("Helvetica", 11)
    c.drawString(left, y, "Payslip")
    y -= 12 * mm

    c.setLineWidth(0.5)
    c.line(left, y, width - left, y)
    y -= 10 * mm

    period = _period_label(payslip.period_year, payslip.period_month)
    rows = [
        ("Employee", payslip.employee.full_name),
        ("Employee ID", str(payslip.employee_id)),
        ("Pay period", period),
        ("Status", payslip.status.value.title()),
        ("Generated on", payslip.generated_at.strftime("%d %b %Y")),
    ]
    c.setFont("Helvetica", 11)
    for label, value in rows:
        c.drawString(left, y, f"{label}:")
        c.drawString(left + 55 * mm, y, str(value))
        y -= 8 * mm

    y -= 6 * mm
    c.line(left, y, width - left, y)
    y -= 12 * mm

    c.setFont("Helvetica-Bold", 12)
    c.drawString(left, y, "Earnings")
    y -= 9 * mm
    c.setFont("Helvetica", 11)
    c.drawString(left, y, "Gross Salary")
    c.drawRightString(width - left, y, f"Rs. {float(payslip.gross_salary):,.2f}")
    y -= 8 * mm

    c.setFont("Helvetica", 10)
    c.setFillGray(0.4)
    c.drawString(left, y, "No deductions configured yet")
    c.setFillGray(0)
    y -= 10 * mm

    c.line(left, y, width - left, y)
    y -= 10 * mm

    c.setFont("Helvetica-Bold", 13)
    c.drawString(left, y, "Net Salary")
    c.drawRightString(width - left, y, f"Rs. {float(payslip.net_salary):,.2f}")

    c.showPage()
    c.save()
    return buffer.getvalue()
