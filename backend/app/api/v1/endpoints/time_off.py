from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_time_off():
    return {"pending": 4, "approved_this_month": 18, "days_out_this_week": 7}
