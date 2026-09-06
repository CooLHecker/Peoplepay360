from fastapi import APIRouter

from app.api.v1.endpoints import (
    attendance,
    auth,
    chat,
    contracts,
    dashboard,
    employees,
    payruns,
    payslips,
    reports,
    salary_rules,
    salary_structures,
    schedules,
    sync,
    time_off,
    users,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(contracts.router, prefix="/contracts", tags=["contracts"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
api_router.include_router(time_off.router, prefix="/time-off", tags=["time-off"])
api_router.include_router(
    salary_structures.router, prefix="/salary-structures", tags=["salary-structures"]
)
api_router.include_router(salary_rules.router, prefix="/salary-rules", tags=["salary-rules"])
api_router.include_router(payruns.router, prefix="/payruns", tags=["payruns"])
api_router.include_router(payslips.router, prefix="/payslips", tags=["payslips"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(sync.router, prefix="/sync", tags=["sync"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
