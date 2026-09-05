from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_salary_rules():
    """Placeholder endpoint for salary_rules."""
    return {"module": "salary_rules", "status": "not_implemented"}
