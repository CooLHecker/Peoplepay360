from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_sync():
    """Placeholder endpoint for sync."""
    return {"module": "sync", "status": "not_implemented"}
