# PeoplePay Offline — Backend

FastAPI backend for PeoplePay Offline.

## Local development

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit DATABASE_URL / JWT_SECRET_KEY

# apply database migrations
alembic upgrade head

# seed the fixed role set + (optionally) one bootstrap admin account
python -m app.db.seed

uvicorn app.main:app --reload
```

API docs available at `/docs` once running.

## Using Aiven (or any managed MySQL that requires TLS)

Set in `.env`:

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
