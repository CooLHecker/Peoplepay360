from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_payslips():
    """Placeholder endpoint for payslips."""
    return {"module": "payslips", "status": "not_implemented"}
