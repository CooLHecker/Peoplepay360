@echo off
setlocal
set ROOT_DIR=%~dp0
set BACKEND_DIR=%ROOT_DIR%backend
set FRONTEND_DIR=%ROOT_DIR%frontend

echo ==^> Setting up backend...
cd /d "%BACKEND_DIR%"
if not exist ".venv" (
  python -m venv .venv
)
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt

if not exist "peoplepay.db" (
  echo ==^> Running migrations...
  alembic upgrade head
  echo ==^> Seeding demo data...
  python -m app.db.seed
)

echo ==^> Setting up frontend...
cd /d "%FRONTEND_DIR%"
if not exist "node_modules" (
  call npm install
)

echo ==^> Starting backend on http://localhost:8000 ...
cd /d "%BACKEND_DIR%"
start "PeoplePay Backend" cmd /k "call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

echo ==^> Starting frontend on http://localhost:5173 ...
cd /d "%FRONTEND_DIR%"
start "PeoplePay Frontend" cmd /k "npm run dev"

echo.
echo ==============================================
echo  App is starting up in two new windows:
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:8000/docs
echo  Close those windows to stop the servers.
echo ==============================================
