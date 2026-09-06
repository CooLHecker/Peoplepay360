# Interloop- HR & Payroll Management System

**A modern, role-based HR and payroll platform for managing employees, attendance, leave, contracts, schedules and payroll operations in one place.**

Interloop is a full-stack HRMS/PWA designed to connect the complete employee lifecycle from employee records and contracts to attendance, time off, payroll and payslips through a secure, role-based workflow.

---

## 1. Overview

Interloop provides separate workspaces and permissions for different types of users, ensuring that each role can access only the modules required for its responsibilities.

### Core workflow

```text
Employee
   ↓
Contract
   ↓
Working Schedule
   ↓
Attendance + Time Off
   ↓
Salary Structure + Rules
   ↓
Payrun
   ↓
Payslip
   ↓
Reports & Dashboard
```

The system also includes an **offline-first foundation**, allowing selected operational actions to be stored locally and synchronized when connectivity is restored.

---

## 2. Key Features

### 👥 Employee Management
- Employee profiles and details
- Employee status and employment information
- Department and job information
- Employee detail pages
- Employee creation and editing
- Employee-specific reports

### 📄 Contract Management
- Create and manage employee contracts
- Contract start and end dates
- Wage/salary information
- Department and position mapping
- Salary structure assignment
- Contract history and payroll-period relevance

### 🕐 Attendance Management
- Employee check-in and check-out
- Attendance status tracking
- Worked-hours calculation
- Late attendance detection
- Missing check-out handling
- Attendance records and reporting
- Geofencing support
- Offline attendance capture and synchronization

### 🏖️ Time Off / Leave
- Leave types
- Leave allocations
- Leave requests
- Approval workflows
- Leave balances
- Request and allocation management
- Offline request support

### 💰 Payroll
- Payroll payruns
- Salary structures
- Configurable salary rules
- Earnings and deductions
- Payroll calculation workflow
- Payslip generation
- Payroll history
- Payroll-related warnings and validation

### 🧾 Payslips
- Individual payslip records
- Salary breakdown
- Earnings and deductions
- Gross and net salary
- Payroll period information
- PDF report generation

### 📊 Dashboards & Reports
- HR dashboard
- Employee dashboard
- Payroll insights
- Employee summary reports
- Attendance and leave information
- Payroll reporting

### 👤 Role-Based Access Control
Interloop supports five primary roles:

| Role | Purpose |
|---|---|
| **Employee** | Access personal information, attendance, leave and permitted employee functions |
| **HR Manager** | Manage HR operations, employees, contracts, attendance and approvals |
| **HR Payroll User** | Perform HR/payroll operations with controlled payroll access |
| **HR Payroll Manager** | Manage advanced HR and payroll operations |
| **Admin** | Full system administration, user management and configuration |

Access to pages and actions is enforced through role-based authorization.

---

## 3. Offline-First Architecture

A major design goal of Interloop is **operational continuity when internet connectivity is unavailable**.

### Online

```text
User
 ↓
React PWA
 ↓
FastAPI
 ↓
Database
```

### Offline

```text
User
 ↓
React PWA
 ↓
IndexedDB / Dexie
 ↓
Local Sync Queue
```

### When connectivity returns

```text
IndexedDB
 ↓
Sync Queue
 ↓
FastAPI API
 ↓
Central Database
```

This architecture is particularly useful for operations such as attendance capture and selected leave workflows.

---

## 4. Technology Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- Recharts
- Lucide React

### Progressive Web App
- PWA architecture
- Service Worker
- Web App Manifest
- IndexedDB
- Dexie.js
- Offline synchronization queue

### Backend
- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic

### Database
- SQLite for local development
- MySQL-compatible configuration for deployment
- Database abstraction through SQLAlchemy

### Authentication & Security
- JWT authentication
- Role-Based Access Control (RBAC)
- Password hashing
- CORS configuration
- Server-side authorization

### Reporting
- ReportLab for PDF generation
- OpenPyXL for spreadsheet/report-related functionality

### Deployment
- Vercel-compatible frontend
- Vercel-compatible FastAPI backend

---

## 5. Project Structure

```text
Interloop/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── routes/
│   │   ├── styles/
│   │   └── types/
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/
│   ├── api/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   ├── migrations/
│   ├── requirements.txt
│   └── vercel.json
│
├── idea.md
└── README.md
```

---

## 6. Frontend Modules

The frontend is organized around HRMS domains:

```text
features/
├── attendance/
├── auth/
├── contracts/
├── dashboard/
├── employees/
├── payroll/
├── schedules/
└── timeoff/
```

Application routes cover areas including:

- Login
- Employee dashboard
- HR dashboard
- Employees
- Contracts
- Working schedules
- Attendance
- Time off
- Payroll
- Payruns
- Payslips
- Salary structures
- Salary rules
- Reports
- User management

---

## 7. Backend Architecture

The backend follows a modular FastAPI structure.

```text
backend/app/
│
├── api/
│   └── v1/
│       └── endpoints/
│           ├── attendance.py
│           ├── auth.py
│           ├── chat.py
│           ├── contracts.py
│           ├── dashboard.py
│           ├── employees.py
│           ├── payruns.py
│           ├── payslips.py
│           ├── reports.py
│           ├── salary_rules.py
│           ├── salary_structures.py
│           ├── schedules.py
│           ├── sync.py
│           ├── time_off.py
│           └── users.py
│
├── models/
├── schemas/
├── services/
├── core/
└── db/
```

The API is versioned under:

```text
/api/v1
```

A health endpoint is also available at:

```text
/api/health
```

---

## 8. Data Model

The main HR relationships are centered around the employee:

```text
Employee
 ├── Contract
 ├── Working Schedule
 ├── Attendance
 ├── Time Off
 └── Payslip
       └── Payrun
            └── Salary Structure
                 └── Salary Rules
```

Authentication and authorization are handled separately through:

```text
User
 └── Roles
```

---

## 9. Authentication & Authorization

Interloop uses **JWT-based authentication** with role-based permissions.

The application separates general HR access from more restricted administrative and payroll functionality.

Examples include:

- Employees can access their own workspace.
- HR roles can manage HR operations according to their permissions.
- Payroll roles can access payroll functionality.
- Admin users have system-level access.
- User management and sensitive reports are restricted to authorized roles.

This ensures that sensitive HR and payroll data is not exposed to unauthorized users.

---

## 10. Local Development

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- Python 3.10+
- Git

### Clone the repository

```bash
git clone <your-repository-url>
cd Interloop
```

### Start the backend

```bash
cd backend

python -m venv .venv
```

Activate the virtual environment:

**Windows**

```bash
.venv\Scripts\activate
```

**macOS / Linux**

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create the environment file:

```bash
cp .env.example .env
```

Run database migrations:

```bash
alembic upgrade head
```

Optionally seed initial roles/demo accounts:

```bash
python -m app.db.seed
```

Start FastAPI:

```bash
uvicorn app.main:app --reload
```

The API will be available locally at:

```text
http://localhost:8000
```

FastAPI documentation:

```text
http://localhost:8000/docs
```

---

## 11. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server will provide the frontend URL shown in the terminal, normally:

```text
http://localhost:5173
```

---

## 12. Environment Variables

Backend configuration is managed through `.env`.

Typical settings include:

```env
DATABASE_URL=sqlite:///./interloop.db
JWT_SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:5173
```

Optional configuration includes:

```env
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=

DEMO_EMPLOYEE_EMAIL=
DEMO_EMPLOYEE_PASSWORD=

OFFICE_LATITUDE=
OFFICE_LONGITUDE=
OFFICE_GEOFENCE_RADIUS_M=

GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
```


---

## 13. Database Migrations

Alembic is used to manage database schema changes.

Apply migrations:

```bash
alembic upgrade head
```

Create a migration after model changes:

```bash
alembic revision --autogenerate -m "describe change"
```

Rollback one migration:

```bash
alembic downgrade -1
```

---

## 14. Build & Production

### Frontend

```bash
cd frontend
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

### Backend

The FastAPI application can be served through:

```text
backend/api/index.py
```

and is configured for Vercel deployment through:

```text
backend/vercel.json
```

---

## 15. Vercel Deployment

The repository is structured so the frontend and backend can be deployed as separate Vercel projects.

### Frontend project

Set:

```text
Root Directory: frontend
Framework Preset: Vite
```

Add the frontend API environment variable:

```env
VITE_API_BASE_URL=<deployed-backend-url>/api/v1
```

### Backend project

Set:

```text
Root Directory: backend
```

Configure the required backend environment variables, including:

```env
DATABASE_URL=
JWT_SECRET_KEY=
CORS_ORIGINS=
```

Make sure the frontend origin is included in `CORS_ORIGINS`.

---

## 16. API Documentation

When the backend is running, FastAPI automatically provides interactive API documentation.

```text
/docs
```

The API is organized into versioned domain endpoints under:

```text
/api/v1/
```

---

## 17. AI Assistant

Interloop includes a backend-integrated AI assistant foundation using Google's Gemini API.

The assistant can be used for controlled, data-oriented HR queries such as:

- Understanding employee information
- Explaining payroll-related information
- Summarizing HR data
- Answering questions using available system context

The Gemini API key is kept **server-side** and is never intended to be exposed to the frontend.

---

## 18. Security Considerations

Because HR and payroll systems handle sensitive business data, Interloop is designed with security in mind.

Key considerations include:

- JWT authentication
- Role-based authorization
- Password hashing
- Server-side permission checks
- Input validation
- CORS configuration
- Environment-based secrets
- Database migrations
- Controlled offline data storage
- Synchronization handling

For production deployments, use:

- HTTPS
- A strong randomly generated JWT secret
- Secure production database credentials
- Restricted CORS origins
- Appropriate database access controls
- Proper secret management

---

## 19. Current Status

### Implemented / Available

- [x] Authentication and login flow
- [x] Role-based access control
- [x] Employee management screens
- [x] Employee dashboard
- [x] HR dashboard
- [x] Contract management
- [x] Working schedules
- [x] Attendance module
- [x] Time-off module
- [x] Payroll module
- [x] Payslips
- [x] Reports
- [x] User management
- [x] Offline-first data layer
- [x] Synchronization foundation
- [x] FastAPI backend
- [x] Database migrations
- [x] PDF/report generation
- [x] Gemini assistant integration

### Future Enhancements

- [ ] Advanced conflict resolution for synchronization
- [ ] Expanded payroll rule engine
- [ ] More comprehensive audit logging
- [ ] Advanced payroll analytics
- [ ] Enhanced anomaly detection
- [ ] Multi-company support
- [ ] Additional integrations
- [ ] Stronger encrypted local storage

---

## 20. Why Interloop?

Traditional HR software often assumes continuous connectivity.

Interloop is designed around a different principle:


By combining a modern HRMS workflow with an offline-first PWA architecture, the platform aims to provide:

- **Continuity** selected operations can continue offline.
- **Centralization** employee, attendance, leave and payroll data are connected.
- **Security** role-based access protects sensitive information.
- **Scalability** modular frontend and backend architecture supports future expansion.
- **Usability** dedicated experiences for employees, HR teams, payroll users and administrators.

---

## 21. Project Goals

The project aims to demonstrate a complete HR and payroll workflow:

```text
Authentication
      ↓
Role-Based Workspace
      ↓
Employee Management
      ↓
Contracts & Schedules
      ↓
Attendance & Time Off
      ↓
Payroll Processing
      ↓
Payslips
      ↓
Reports & Analytics
```

while maintaining an architecture capable of supporting offline operation and synchronization.

---

## 22. Contributing

Contributions and improvements are welcome.

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/your-feature
```

3. Make your changes.
4. Test the frontend and backend.
5. Commit your changes.

```bash
git commit -m "Add: your feature"
```

6. Push the branch.

```bash
git push origin feature/your-feature
```

7. Open a Pull Request.

---



## 23. Project Summary

**Interloop** is a full-stack, role-based HR and payroll management platform built with **React, TypeScript, FastAPI, SQLAlchemy and a PWA/offline-first architecture**.

It brings together:

**Employees · Contracts · Schedules · Attendance · Time Off · Payroll · Payslips · Reports · User Management**

into a single connected HR workflow.



