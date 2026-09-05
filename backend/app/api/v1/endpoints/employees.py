from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_employees():
    return [
        {"id": "EMP-1042", "fullName": "Sarah Jenkins", "departmentId": "Product", "positionId": "Product Designer", "employmentStatus": "active"},
        {"id": "EMP-1041", "fullName": "Marcus Chen", "departmentId": "Engineering", "positionId": "Senior Engineer", "employmentStatus": "active"},
        {"id": "EMP-1040", "fullName": "Priya Shah", "departmentId": "People", "positionId": "People Partner", "employmentStatus": "active"},
    ]
