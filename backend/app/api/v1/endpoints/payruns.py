from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_payruns():
    return [{"id": "PAY-2026-08", "period": "August 2026", "employees": 124, "gross": 1824500, "status": "Completed"}]
