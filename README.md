# Interloop Offline

Offline-first HR & Payroll Progressive Web App.

Monorepo layout — two independent deployables in one repo:

```
interloop-offline/
├── frontend/   React + TypeScript + Vite + Tailwind + PWA (Vercel: framework preset "Vite")
└── backend/    FastAPI + SQLAlchemy + SQLite locally / MySQL in prod (Vercel: Python serverless via api/index.py)
```

## Deploying on Vercel

Each directory is meant to become its **own Vercel project**, both pointed at
this repo with a different **Root Directory** setting:

| Vercel Project      | Root Directory | Framework Preset |
|----------------------|-----------------|-------------------|
| interloop-frontend   | `frontend`      | Vite              |
| interloop-backend    | `backend`       | Other (uses `backend/vercel.json`) |

Steps:
1. Push this repo to GitHub.
2. In Vercel: "Add New Project" → import the repo → set **Root Directory** to `frontend` → deploy.
3. Repeat: "Add New Project" → import the same repo → set **Root Directory** to `backend` → deploy.
4. Set `VITE_API_BASE_URL` in the frontend project's env vars to the backend's deployed URL + `/api/v1`.
5. Set `DATABASE_URL`, `JWT_SECRET_KEY`, `CORS_ORIGINS` etc. in the backend project's env vars.

## Local development

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Frontend dev server proxies `/api` to `http://localhost:8000` (see `frontend/vite.config.ts`).

## Structure at a glance

- `frontend/src/features/*` — one folder per domain (employees, attendance, timeoff, payroll, dashboard, auth) — currently placeholders, ready to be filled in.
- `frontend/src/lib/db.ts` — Dexie/IndexedDB schema for offline-first storage.
- `frontend/src/lib/sync-engine.ts` — sync queue flush logic (PENDING → SYNCING → SYNCED/FAILED).
- `backend/app/api/v1/endpoints/*` — one router per domain, all currently placeholder responses.
- `backend/app/core/config.py` — environment-driven settings.

See `idea.md` (project brief) for the full product/architecture spec this scaffold is based on.
