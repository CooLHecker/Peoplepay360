"""Idempotent seed script.

Creates the fixed set of roles used by the login/access-control flow,
and — only if BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD are set —
a single bootstrap Admin user, since there is no User Management
screen yet for an admin to create the very first account.

Run with:
    python -m app.db.seed
"""

import os

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Role, RoleName, User

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
    email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL")
    password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD")
    if not email or not password:
        print("BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD not set - skipping admin seed.")
        return

    existing = db.query(User).filter(User.email == email.lower()).first()
    if existing is not None:
        print(f"Admin user {email} already exists - skipping.")
        return

    admin = User(email=email.lower(), hashed_password=hash_password(password), is_active=True)
    admin.roles.append(roles[RoleName.ADMIN])
    db.add(admin)
    db.commit()
    print(f"Bootstrap admin created: {email}")


def main() -> None:
    db = SessionLocal()
    try:
        roles = seed_roles(db)
        seed_bootstrap_admin(db, roles)
    finally:
        db.close()


if __name__ == "__main__":
    main()
