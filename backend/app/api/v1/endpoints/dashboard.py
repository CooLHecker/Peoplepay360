from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_dashboard():
    return {"employees": 124, "present_today": 112, "pending_time_off": 4, "next_payroll_total": 1842000}
