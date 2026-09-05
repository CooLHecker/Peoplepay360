"""Idempotent seed script.

Creates the fixed set of roles used by the login/access-control flow,
and — only if the relevant settings are set in .env — a bootstrap
Admin account and a demo Employee account, since there is no User
Management screen yet for an admin to create accounts through.

Run with:
    python -m app.db.seed
"""

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Employee, EmploymentStatus, Role, RoleName, TimeOffType, TimeOffWorkEntryBehavior, User

settings = get_settings()

ROLE_DESCRIPTIONS = {
    RoleName.EMPLOYEE: "Own employee info, attendance, leave, permitted payslips.",
    RoleName.HR_MANAGER: "Employees, contracts, attendance, time off, approvals.",
    RoleName.HR_PAYROLL_USER: "HR operations, payruns, payslips, read-only salary config.",
    RoleName.HR_PAYROLL_ADMIN: "Salary structures, salary rules, payruns, payslips, HR/payroll ops.",
    RoleName.ADMIN: "User management, role assignment, permissions, system configuration.",
}


def seed_roles(db) -> dict[str, Role]:
    roles: dict[str, Role] = {}
    for name in RoleName.ALL:
        role = db.query(Role).filter(Role.name == name).first()
        if role is None:
            role = Role(name=name, description=ROLE_DESCRIPTIONS[name])
            db.add(role)
            db.flush()
            print(f"Created role: {name}")
        roles[name] = role
    db.commit()
    return roles


def seed_bootstrap_admin(db, roles: dict[str, Role]) -> None:
    email = settings.bootstrap_admin_email
    password = settings.bootstrap_admin_password
    if not email or not password:
        print("BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD not set in .env - skipping admin seed.")
        return

    existing = db.query(User).filter(User.email == email.lower()).first()
    if existing is not None:
        print(f"Admin user {email} already exists - skipping (edit their password via the DB directly if you changed .env).")
        return

    admin = User(email=email.lower(), hashed_password=hash_password(password), is_active=True)
    admin.roles.append(roles[RoleName.ADMIN])
    db.add(admin)
    db.commit()
    print(f"Bootstrap admin created: {email}")


def seed_demo_employee(db, roles: dict[str, Role]) -> None:
    """Creates one plain "employee"-role account so admin-vs-employee
    behavior is actually testable out of the box (there is no
    User Management screen yet to create one through)."""
    email = settings.demo_employee_email
    password = settings.demo_employee_password
    if not email or not password:
        print("DEMO_EMPLOYEE_EMAIL / DEMO_EMPLOYEE_PASSWORD not set in .env - skipping demo employee seed.")
        return

    existing = db.query(User).filter(User.email == email.lower()).first()
    if existing is not None:
        print(f"Employee user {email} already exists - skipping (edit their password via the DB directly if you changed .env).")
        return

    employee = Employee(
        full_name=settings.demo_employee_name,
        work_email=email.lower(),
        employment_status=EmploymentStatus.active,
    )
    db.add(employee)
    db.flush()

    user = User(email=email.lower(), hashed_password=hash_password(password), is_active=True)
    user.employee_id = employee.id
    user.roles.append(roles[RoleName.EMPLOYEE])
    db.add(user)
    db.commit()
    print(f"Demo employee created: {email}")


DEFAULT_TIME_OFF_TYPES = [
    {"name": "Annual Leave", "description": "Paid yearly leave allocation.", "requires_allocation": True, "work_entry_behavior": TimeOffWorkEntryBehavior.paid},
    {"name": "Sick Leave", "description": "Paid leave for illness.", "requires_allocation": True, "work_entry_behavior": TimeOffWorkEntryBehavior.paid},
    {"name": "Unpaid Leave", "description": "Leave without pay, no allocation required.", "requires_allocation": False, "work_entry_behavior": TimeOffWorkEntryBehavior.unpaid},
]


def seed_time_off_types(db) -> None:
    for spec in DEFAULT_TIME_OFF_TYPES:
        existing = db.query(TimeOffType).filter(TimeOffType.name == spec["name"]).first()
        if existing is None:
            db.add(TimeOffType(**spec))
            print(f"Created time off type: {spec['name']}")
    db.commit()


def main() -> None:
    db = SessionLocal()
    try:
        roles = seed_roles(db)
        seed_bootstrap_admin(db, roles)
        seed_demo_employee(db, roles)
        seed_time_off_types(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
