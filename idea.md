# Interloop Offline — Idea.md

## 1. Project Title

**Interloop Offline**  
### An Offline-First HR & Payroll Progressive Web App

---

## 2. One-Line Idea

A reliable, offline-first HR and payroll PWA that allows organizations to manage employees, attendance, leave, and payroll preparation even with unreliable internet connectivity, then automatically synchronizes local changes with the central server when connectivity returns.

---

## 3. Problem Statement

Small businesses and organizations may operate in locations where internet connectivity is unstable or unavailable. A conventional cloud-only HR system can prevent employees and HR staff from recording attendance, submitting leave requests, or accessing important payroll information when the network goes down.

At the same time, HR and payroll operations are tightly connected:

**Employee → Contract → Schedule → Attendance → Leave → Salary Rules → Payrun → Payslip**

The project aims to combine these workflows into one system while making essential operations resilient to connectivity problems.

---

## 4. Proposed Solution

Interloop Offline uses a **local-first PWA architecture**.

The application is installed like a normal app but runs through the browser. Core application resources and permitted operational data are stored locally using IndexedDB.

When online:

**PWA → FastAPI → PostgreSQL**

When offline:

**PWA → IndexedDB → Local Operations**

When connectivity returns:

**IndexedDB → Sync Queue → FastAPI → PostgreSQL**

This means the application can continue supporting selected HR operations without requiring a constant internet connection.

---

## 5. Core Features

### A. Employee Management

- Employee profiles
- Department and manager
- Job position
- Employee type
- Employment status
- Working schedule
- Related contracts
- Related attendance
- Related time-off records

The Employee record acts as the central hub for HR operations.

---

### B. Contract Management

- Create and manage contracts
- Contract start/end dates
- Wage/salary
- Department
- Position
- Salary structure
- Historical contracts
- Identify the contract applicable to a payroll period

Payroll should not blindly use the latest contract. It should resolve the contract applicable to the selected payroll period.

---

### C. Attendance

- Check-in
- Check-out
- Worked-hours calculation
- Attendance status
- Missing check-out detection
- Authorized corrections
- Offline attendance capture

Offline attendance is one of the primary use cases for the PWA architecture.

Example:

**No Internet → Employee records attendance → Saved locally → Internet returns → Automatically synchronized**

---

### D. Time Off / Leave

- Leave types
- Leave allocations
- Leave requests
- Approval/refusal
- Leave balance
- Remaining allocation
- Validity periods
- Offline request creation

Approved leave requests update the relevant allocation.

---

### E. Salary Structures

A salary structure contains the rules required to calculate a payslip.

Example:

**Regular Salary**

- Basic
- Allowance
- Deduction
- Contribution
- Gross
- Net

---

### F. Salary Rule Engine

Salary rules should be configurable instead of hardcoded.

Rules can support:

- Fixed amounts
- Percentages
- Formula-based calculations
- Ordered execution
- Earnings
- Allowances
- Deductions

Example:

**Basic Salary → Allowances → Gross Salary → Deductions → Net Salary**

---

### G. Payrun

Payrun workflow:

1. Select payroll period
2. Select salary structure
3. Identify eligible employees
4. Resolve applicable contracts
5. Read attendance and approved leave
6. Execute salary rules
7. Calculate payslips
8. Display warnings
9. Validate
10. Mark paid

Warnings can include:

- Missing employee information
- Missing bank details
- Duplicate payslip
- Contract conflict
- Attendance anomaly

---

### H. Payslips

- Payslip generation
- Salary breakdown
- Worked days
- Basic salary
- Allowances
- Deductions
- Gross salary
- Net salary
- PDF generation
- Payroll history

---

### I. Payroll Dashboard

Dashboard should use live system data rather than static charts.

Possible KPIs:

- Total net salary
- Payslips generated
- Average salary
- Approved time off
- Attendance health
- Headcount

Charts:

- Salary cost by department
- Monthly net salary trend
- Attendance overview
- Leave overview

---

# 6. Offline-First Architecture

## Application Shell

The Service Worker caches essential resources:

- HTML
- JavaScript
- CSS
- Fonts
- Icons
- Static application assets

This allows the application interface to load even without internet.

---

## Local Data

Use:

**IndexedDB + Dexie.js**

Suggested local stores:

- employees
- contracts
- attendance
- time_off
- salary_structures
- salary_rules
- payruns
- payslips
- sync_queue

---

## Sync Queue

Every permitted offline write is recorded in a synchronization queue.

Example:

```text
{
  operationId,
  entity,
  action,
  payload,
  createdAt,
  status
}
```

Possible states:

**PENDING → SYNCING → SYNCED**

If synchronization fails:

**SYNCING → FAILED → RETRY**

---

# 7. Online / Offline Flow

```text
                    USER
                     |
                     v
              React PWA
                     |
              Check Connectivity
                /          \
           ONLINE          OFFLINE
             |                |
             v                v
        FastAPI API       IndexedDB
             |                |
             v                v
        PostgreSQL        Sync Queue
                              |
                     Connection Restored
                              |
                              v
                         FastAPI API
                              |
                              v
                         PostgreSQL
```

---

# 8. Conflict Strategy

Not every payroll operation should be treated equally.

### Safe for offline operation

- Attendance capture
- Leave request drafts
- Viewing previously synchronized employee data
- Local form progress
- Local operational records

### Server-authoritative operations

- Final payroll validation
- Final payment status
- Role/permission changes
- Critical payroll configuration
- Finalized payroll records

This prevents conflicting offline copies from becoming the final source of truth for sensitive payroll operations.

---

# 9. User Roles

### Employee

- View own employee details
- Record attendance
- Submit time-off requests
- View permitted records

### HR Manager

- Employees
- Contracts
- Attendance
- Time Off
- Approvals

### HR Payroll User

- HR operations
- Payruns
- Payslips
- Read salary configuration

### HR Payroll Manager

- Full HR/payroll operations
- Salary structures
- Salary rules
- Payruns
- Payslips

### Admin

- Complete system access
- User management
- Role assignment
- Permissions
- System configuration

---

# 10. Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- Recharts

## PWA

- Service Worker
- Workbox
- Web App Manifest
- IndexedDB
- Dexie.js
- Background Sync / custom synchronization queue

## Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy

## Database

- PostgreSQL

## Authentication

- JWT
- Role-Based Access Control

## PDF

- Backend PDF generation

## Development

- Git
- GitHub
- Docker

---

# 11. Database Model

```text
Employee
   |
   +---- Contract
   |
   +---- Attendance
   |
   +---- TimeOff
   |
   +---- Payslip
             |
             +---- Payrun
                      |
                      +---- Salary Structure
                                |
                                +---- Salary Rules
```

Additional entities:

```text
User
Role
Department
WorkingSchedule
TimeOffType
TimeOffAllocation
SyncQueue
AuditLog
```

---

# 12. API Structure

Suggested REST API:

```text
/auth
/employees
/contracts
/schedules
/attendance
/time-off
/salary-structures
/salary-rules
/payruns
/payslips
/dashboard
/sync
```

Example:

```text
POST /attendance/check-in
POST /attendance/check-out

POST /time-off/requests

POST /payruns
POST /payruns/{id}/compute
POST /payruns/{id}/validate

GET /employees/{id}
GET /employees/{id}/attendance
GET /employees/{id}/contracts

POST /sync
```

---

# 13. What Makes It Different

Most HR systems assume:

**Internet → Server → Application**

Interloop Offline uses:

**User → Local Application → Local Database → Synchronization → Central Database**

The major differentiator is therefore not simply having a PWA.

It is **operational continuity**.

The application can continue selected HR operations during connectivity failures and synchronize changes later.

---

# 14. Optional Intelligence Layer

AI should be used only where it provides real value.

Possible additions:

### Payroll Anomaly Detection

Identify unusual payroll patterns such as:

- Sudden salary changes
- Unusual overtime
- Abnormal deductions
- Unexpected department payroll increases

### Attendance Anomaly Detection

Identify:

- Unusual attendance patterns
- Repeated missing check-outs
- Sudden overtime spikes

### Payroll Assistant

A controlled assistant could answer questions such as:

- "Why did this employee's salary change?"
- "Which department has the highest salary cost?"
- "How many leave requests are pending?"

The AI layer should explain existing system data rather than become responsible for the core payroll calculation.

---

# 15. Security & Reliability

Because payroll contains sensitive business information:

- JWT authentication
- Role-based authorization
- Input validation
- API validation with Pydantic
- Audit logs
- HTTPS in production
- Minimal local storage
- Server-side authorization
- Conflict detection
- Sync retry mechanism
- No sensitive payroll data stored unnecessarily on shared devices

---

# 16. Demo Flow

A strong 5-minute demonstration:

### Flow 1 — Offline Attendance

```text
Login
 ↓
Employee Dashboard
 ↓
Turn off internet
 ↓
Check In
 ↓
Record saved locally
 ↓
Show Offline indicator
 ↓
Turn internet back on
 ↓
Automatic synchronization
 ↓
Attendance appears on server
```

### Flow 2 — Payroll

```text
HR Manager
 ↓
Employee
 ↓
Contract
 ↓
Attendance + Leave
 ↓
Create Payrun
 ↓
Salary Rules
 ↓
Compute
 ↓
Validation Warnings
 ↓
Payslip
 ↓
Generate PDF
 ↓
Dashboard updates
```

---

# 17. Key Selling Point

> **"Payroll should not stop just because the internet does."**

Interloop Offline is designed around this principle.

Instead of treating offline support as a fallback page, the system treats **offline capability as part of the core architecture**.

---

# 18. Future Scope

- Multi-device synchronization
- Advanced conflict resolution
- Biometric attendance integration
- Local network synchronization
- Progressive background synchronization
- Payroll forecasting
- Advanced anomaly detection
- Multi-company support
- Multi-currency payroll
- Native mobile wrapper
- Encrypted local database
- Automated compliance checks

---

# 19. Success Criteria

The project should demonstrate:

- Responsive UI
- Functional PWA installation
- Application shell available offline
- Local IndexedDB storage
- Offline attendance operation
- Synchronization after reconnection
- Working employee/contract relationships
- Functional leave allocation and approval
- Configurable salary rules
- Correct payroll computation
- Payrun validation
- Payslip PDF generation
- Live dashboard metrics
- Role-based access
- Proper Git-based team development

---

# 20. Final Concept

**Interloop Offline** is an offline-first HR and payroll Progressive Web App designed for organizations that cannot depend on continuous internet connectivity.

It connects:

**Employees + Contracts + Schedules + Attendance + Leave + Salary Rules + Payroll + Payslips + Analytics**

into one operational system while using:

**React + TypeScript + PWA + Service Workers + IndexedDB + Dexie.js + FastAPI + PostgreSQL**

to provide both **offline resilience and centralized synchronization**.
