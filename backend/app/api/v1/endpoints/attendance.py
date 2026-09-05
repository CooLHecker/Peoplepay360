from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_attendance():
    return {"date": "2026-09-05", "present": 112, "late": 8, "on_leave": 4}
