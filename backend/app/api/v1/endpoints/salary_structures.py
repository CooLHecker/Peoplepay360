from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_salary_structures():
    """Placeholder endpoint for salary_structures."""
    return {"module": "salary_structures", "status": "not_implemented"}
