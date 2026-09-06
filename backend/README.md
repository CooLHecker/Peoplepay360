# Interloop Offline — Backend

FastAPI backend for Interloop Offline.

## Local development

By default this runs against a local **SQLite** file — no database
server to install, no Aiven/MySQL account needed.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# .env already defaults DATABASE_URL to sqlite:///./interloop.db —
# no edits needed unless you want to set BOOTSTRAP_ADMIN_EMAIL/PASSWORD
# or a real JWT_SECRET_KEY.

# apply database migrations (creates backend/interloop.db)
alembic upgrade head

# seed the fixed role set + (optionally) a bootstrap admin account
# and a demo employee account — set BOOTSTRAP_ADMIN_* / DEMO_EMPLOYEE_*
# in .env first if you want either created
python -m app.db.seed

uvicorn app.main:app --reload
```

API docs available at `/docs` once running. The SQLite file
(`backend/interloop.db`) is created automatically the first time you
run `alembic upgrade head` — delete it any time to reset the database.

## Using MySQL / Aiven instead of SQLite (optional)

Only needed if you'd rather not use the SQLite default. Set in `.env`:

```
DATABASE_URL=mysql+pymysql://avnadmin:<password>@<host>:<port>/defaultdb
DB_SSL_REQUIRED=true
```

PyMySQL ignores the `?ssl-mode=REQUIRED` query param some providers
give you in their connection string — `DB_SSL_REQUIRED=true` is what
actually turns on TLS (see `app/db/session.py`). This gives you an
encrypted connection without verifying the server's certificate,
which is fine for development. For full CA verification in
production, download the provider's CA cert (in Aiven: your
service's Overview page → "CA Certificate") and set `DB_SSL_CA` to
its path.

## Database migrations (Alembic)

```bash
alembic upgrade head                       # apply all migrations
alembic revision --autogenerate -m "msg"   # generate a new migration from model changes
alembic downgrade -1                       # roll back one migration
```

## Build status by screen

Backend work is being built one screen/module at a time. Implemented so far:

- ✅ **Login** — see [`docs/LOGIN_API.md`](docs/LOGIN_API.md) for the full API contract.
- ⬜ User Management (Admin)
- ⬜ Employees
- ⬜ Contracts
- ⬜ Attendance
- ⬜ Time Off
- ⬜ Salary Structures / Rules
- ⬜ Payruns / Payslips
- ⬜ Dashboard
- ⬜ Sync

## Deployment

Deployed on Vercel via `api/index.py`, which exposes the FastAPI `app`
as a serverless ASGI function. See `vercel.json`.

**Note:** Vercel's serverless functions are stateless per-invocation —
run `alembic upgrade head` and the seed script against your production
database from your own machine or CI, not from the serverless function
itself.
