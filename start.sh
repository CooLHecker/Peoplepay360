#!/usr/bin/env bash
# Starts both the backend (FastAPI, port 8000) and frontend (Vite, port 5173).
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "==> Setting up backend..."
cd "$BACKEND_DIR"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f "peoplepay.db" ]; then
  echo "==> Running migrations..."
  alembic upgrade head
  echo "==> Seeding demo data..."
  python -m app.db.seed
fi

echo "==> Setting up frontend..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
  npm install
fi

cleanup() {
  echo ""
  echo "==> Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "==> Starting backend on http://localhost:8000 ..."
cd "$BACKEND_DIR"
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

echo "==> Starting frontend on http://localhost:5173 ..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=============================================="
echo " App is starting up:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000/docs"
echo " Press Ctrl+C to stop both servers."
echo "=============================================="

wait "$BACKEND_PID" "$FRONTEND_PID"
