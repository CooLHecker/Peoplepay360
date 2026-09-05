from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_contracts():
    """Placeholder endpoint for contracts."""
    return {"module": "contracts", "status": "not_implemented"}
