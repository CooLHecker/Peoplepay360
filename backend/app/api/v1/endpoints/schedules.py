from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_schedules():
    """Placeholder endpoint for schedules."""
    return {"module": "schedules", "status": "not_implemented"}
