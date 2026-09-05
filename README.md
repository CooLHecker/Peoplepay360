# PeoplePay Offline

Merged project: FastAPI backend (`backend/`) + React/Vite frontend (`frontend/`).

## Quick start

**Requirements:** Python 3.10+ and Node.js 18+.

### Mac / Linux

```bash
./start.sh
```

### Windows

```bat
start.bat
```

Either script will:
1. Create a Python virtualenv in `backend/.venv` and install backend deps
2. Run database migrations and seed demo accounts (first run only)
3. Install frontend deps (first run only)
4. Start the backend on **http://localhost:8000**
5. Start the frontend on **http://localhost:5173**

Open **http://localhost:5173** in your browser — the frontend proxies
`/api` requests to the backend automatically (already configured in
`frontend/vite.config.ts`).

Press `Ctrl+C` to stop both servers.

## Demo logins

Seeded automatically on first run (see `backend/.env`):

- Admin: `admin@peoplepay.local` / `Admin123!`
- Employee: `employee@peoplepay.local` / `Employee123!`

## Manual start (if you prefer)

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Then visit http://localhost:5173.
