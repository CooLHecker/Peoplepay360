# OXP HRMS — COMPLETE COPILOT FRONTEND FIX + FEATURE IMPLEMENTATION PROMPT

## ROLE

You are working as a senior full-stack/frontend engineer on an existing **OXP HRMS / Odoo HR & Payroll Hackathon** application.

Your job is to:

1. Inspect the existing repository before changing anything.
2. Fix all currently broken frontend functionality listed below.
3. Add the missing frontend features and screens described below.
4. Make the application follow the HRMS functional flow defined in this prompt.
5. Preserve the existing backend, API contracts, database, authentication infrastructure, and working functionality wherever possible.
6. Do NOT blindly rebuild the application from scratch.
7. Reuse existing components, routes, services, hooks, models, types, and UI patterns wherever they already exist.

The final result must be a **working, polished, responsive HRMS**, not just a visual mockup.

---

# 1. FIRST: INSPECT THE EXISTING PROJECT

Before making changes, inspect:

- `package.json`
- Project/framework structure
- Routes
- Pages
- Components
- API/service layer
- Database models/types
- Authentication
- State management
- Existing employee functionality
- Existing admin dashboard
- Existing employee dashboard
- Existing CSV upload implementation
- Existing payroll implementation
- Existing attendance implementation
- Existing time-off implementation
- Existing UI/design system

Determine:

- Which features already work
- Which features are partially implemented
- Which features are only visual
- Which APIs already exist
- Which APIs are missing
- Which frontend buttons are currently disconnected
- Which routes are broken
- Which components can be reused

### IMPORTANT

Do not replace a working implementation merely because you would implement it differently.

Prefer:

```text
Existing functionality
        ↓
Fix / extend
        ↓
Reuse
```

over:

```text
Delete existing implementation
        ↓
Rewrite everything
```

---

# 2. CRITICAL BUGS TO FIX FIRST

These are confirmed issues and MUST be fixed.

## BUG 1 — View Employee Details button is not working

Current problem:

> The "View Employee Details" button does not open the employee details page.

### Required behavior

When clicking:

`View Employee Details`

it must:

1. Identify the selected employee.
2. Navigate to the correct Employee Details/Form page.
3. Load the actual employee data.
4. Never open an empty or incorrect employee.
5. Work from:
   - Employee list
   - Employee Kanban
   - Admin dashboard employee cards/table
   - Search results
   - Any other place where the button appears.

### Employee details page must include

- Employee name
- Profile/avatar
- Employee ID
- Email
- Phone
- Department
- Job position
- Manager
- Work location
- Employee status
- Joining date if supported
- Contract information
- Working schedule
- Attendance information
- Time Off information

### Employee smart buttons

Include:

```text
Contracts
Attendance
Time Off
Allocations
```

Clicking each must open the corresponding page filtered for that employee.

### Technical requirement

Do not hardcode an employee ID.

The route must receive/use the actual selected employee ID.

Examples:

```text
/employees/:id
/employees/:employeeId
```

Use whatever routing convention the existing project already follows.

---

# 3. BUG 2 — Separate Login Experience for ADMIN and EMPLOYEE

The application needs authentication for both:

## Admin

Admin should be able to access:

- Admin Dashboard
- Employees
- Contracts
- Attendance
- Time Off
- Payroll
- Payruns
- Payslips
- Salary Structures
- Salary Rules
- Reports
- User Management
- Employee management
- CSV import
- Administrative actions

## Employee

Employee should have a restricted employee-facing dashboard.

Employee should NOT see:

- Salary Rules management
- Salary Structures management
- User management
- Bulk employee management
- CSV import
- Administrative controls
- Other employees' private HR data
- Payroll administration
- System configuration

---

# 4. LOGIN PAGE

Create/fix the login page.

## Login UI

Include:

- OXP HRMS logo/branding
- Email / username
- Password
- Show/hide password
- Remember me if supported
- Login button
- Forgot password if backend supports it
- Loading state
- Invalid credentials error
- Account disabled error

## Role-aware login

After authentication:

```text
Admin
  ↓
Admin Dashboard

Employee
  ↓
Employee Dashboard
```

Do NOT simply allow the user to choose "Admin" and bypass authentication.

The role must come from the authenticated user's actual permissions/role.

If the existing backend already returns the user role, use that.

If the backend does not yet expose role information, implement the smallest compatible role mechanism necessary rather than creating an insecure frontend-only role selector.

---

# 5. ADMIN DASHBOARD

Create/fix a dedicated Admin Dashboard.

The Admin Dashboard is the central management screen.

## Admin Navbar

Use:

```text
OXP HRMS

Dashboard

Employees ▼
    Employees
    Contracts
    Departments
    Working Schedules

Attendance

Time Off ▼
    Dashboard
    Requests
    Allocations
    Time Off Types

Payroll ▼
    Dashboard
    Payruns
    Payslips
    Salary Structures
    Salary Rules

Reports

User / Admin ▼
    Profile
    User Management
    Settings
    Logout
```

Only show items that the authenticated admin is authorized to use.

---

# 6. ADMIN DASHBOARD — REQUIRED FEATURES

The admin dashboard should contain:

## KPI Cards

### Total Employees

Show:

- Total employees
- Active employees
- Inactive employees

Actions:

`View Employees`

---

### Total Payroll

Show:

- Current payroll
- Previous period comparison
- Optional percentage change

Action:

`View Payroll`

---

### Attendance

Show:

- Present
- Absent
- Late
- Missing check-outs

Action:

`View Attendance`

---

### Time Off

Show:

- Pending requests
- Approved requests
- Total approved days

Action:

`View Time Off`

---

### Payslips

Show:

- Generated
- Pending
- Paid

Action:

`View Payslips`

---

# 7. ADMIN DASHBOARD — QUICK ACTIONS

Provide prominent quick action buttons:

```text
+ Add Employee
Import Employees
Create Contract
Mark Attendance
Create Time Off Request
Create Allocation
Create Payrun
View Payslips
```

Every button MUST perform an actual action/navigation.

No dead buttons.

---

# 8. ADMIN DASHBOARD — EMPLOYEE SECTION

Include a recent employees section/table.

Columns:

- Employee
- Employee ID
- Department
- Job Position
- Contract Status
- Attendance Status
- Actions

Actions:

```text
View
Edit
```

### View

Must open the correct employee details page.

### Edit

Must open the employee edit form with the actual employee data populated.

---

# 9. ADMIN DASHBOARD — ALERTS

Show actionable alerts:

- Employees missing required information
- Employees without active contracts
- Contracts expiring soon
- Missing attendance check-outs
- Pending Time Off requests
- Payroll warnings
- Payslips not validated
- Failed CSV imports

Clicking an alert should take the admin directly to the relevant page.

---

# 10. EMPLOYEE DASHBOARD

After an employee logs in, show an employee-specific dashboard.

The employee should only see their own information.

## Employee Navbar

Use:

```text
OXP HRMS

My Dashboard

My Profile

Attendance

Time Off ▼
    My Requests
    My Allocations

Payroll ▼
    My Payslips

Help / Notifications

Profile ▼
    Account
    Logout
```

Do NOT expose admin navigation.

---

# 11. EMPLOYEE DASHBOARD — REQUIRED CARDS

## My Attendance

Show:

- Today's status
- Check-in time
- Check-out time
- Worked hours

Actions:

```text
Check In
Check Out
View Attendance
```

The button must change based on the actual attendance state.

---

## My Time Off

Show:

- Available leave balance
- Pending requests
- Approved days

Actions:

```text
Request Time Off
View My Requests
```

---

## My Payroll

Show:

- Latest payslip
- Net salary
- Pay period
- Payslip status

Actions:

```text
View Payslip
Download Payslip
```

Only the logged-in employee's payslips should be visible.

---

## My Contract

Show:

- Contract status
- Job position
- Start date
- End date
- Wage if permitted by the existing access policy

Action:

`View Contract`

---

# 12. EMPLOYEE PROFILE

Create/fix:

`My Profile`

Include:

- Name
- Employee ID
- Profile image
- Email
- Phone
- Department
- Job position
- Manager
- Work location
- Joining date
- Working schedule

Allow editing only of fields the employee is authorized to edit.

Sensitive HR/payroll information should remain read-only or hidden depending on the existing access model.

---

# 13. ADD EMPLOYEE — CURRENT BUG

Current problem:

> Employee adding is not working.

This MUST be fixed.

## Add Employee button

The following buttons must open the same functional creation flow:

- `+ Add Employee`
- `New Employee`
- Admin Dashboard → Add Employee
- Employees → New

## Employee creation form

Include:

### Basic Information

- Employee Name
- Employee ID
- Profile Image
- Email
- Phone

### Work Information

- Department
- Job Position
- Manager
- Work Location
- Company
- Joining Date
- Employment Status

### Payroll / HR Information

Where supported:

- Employee Type
- Working Schedule
- Salary Structure
- Bank information
- Tax/payroll information

### Contract Information

If contract creation is part of the existing workflow, allow:

- Create Contract
- Contract Start Date
- Contract End Date
- Wage
- Salary Structure
- Working Schedule

If contract is a separate backend resource, create the employee first and then provide a clear next step to create the contract.

---

# 14. EMPLOYEE CREATION VALIDATION

Required fields must be clearly marked.

Validate:

- Name
- Email
- Employee ID if required
- Department if required
- Job Position if required
- Other backend-required fields

Show inline validation errors.

Example:

```text
Employee name is required.
Please enter a valid email address.
Employee ID already exists.
```

Do not clear the entire form after validation failure.

---

# 15. EMPLOYEE CREATION SUCCESS

After successful creation:

1. Show success notification.
2. Refresh employee data.
3. Navigate to the newly created Employee Details page OR return to Employees List.
4. Make the new employee immediately visible.
5. Ensure the new employee can be opened using `View Employee Details`.

Example:

```text
Employee created successfully.

[Aarav Mehta]
Employee ID: EMP-1042

[View Employee]
```

---

# 16. CSV EMPLOYEE UPLOAD — CURRENT BUG

Current problem:

> CSV file cannot be uploaded.

This MUST be fixed.

## Admin-only feature

Add:

`Import Employees`

to the Employees page and/or Admin Dashboard.

---

# 17. CSV IMPORT UI

Create a proper import modal/page.

Include:

```text
Import Employees

[ Download CSV Template ]

Drag & Drop CSV here
or
[ Choose CSV File ]

Selected file:
employees.csv

[ Validate CSV ]

[ Import Employees ]
```

---

# 18. CSV TEMPLATE

Provide a downloadable template with appropriate headers.

Suggested columns:

```text
employee_id
name
email
phone
department
job_position
manager
work_location
joining_date
employee_type
employment_status
working_schedule
```

Only include columns that the backend actually supports.

If additional required fields exist, include them in the template.

---

# 19. CSV VALIDATION

Before importing, validate:

- File extension
- MIME type if available
- File is not empty
- Required headers exist
- Required fields exist
- Email format
- Duplicate employee IDs
- Duplicate email addresses
- Invalid department references
- Invalid job positions
- Invalid dates
- Invalid enum/status values

Show a preview:

```text
CSV Validation

Total Rows: 50
Valid Rows: 46
Rows with Errors: 4
```

Then show an error table:

| Row | Field | Error |
|---|---|---|
| 4 | email | Invalid email |
| 12 | employee_id | Duplicate ID |
| 19 | department | Department not found |
| 31 | joining_date | Invalid date |

---

# 20. CSV IMPORT BEHAVIOR

Do NOT silently import bad data.

Recommended flow:

```text
Choose CSV
   ↓
Parse CSV
   ↓
Validate
   ↓
Preview
   ↓
Show errors
   ↓
Import valid rows
```

If the backend supports transactional import, prefer:

```text
All valid → Import
Any invalid → Fix and retry
```

If partial import is already supported, clearly tell the admin which rows succeeded and which failed.

---

# 21. CSV IMPORT RESULT

After successful import:

```text
Import Complete

48 employees imported
2 rows skipped

[View Employees]
```

Provide an error CSV download if rows failed validation.

---

# 22. EMPLOYEES MODULE

## Required views

Employee module MUST support:

- Kanban
- List
- Form

Default view:

`Kanban`

---

# 23. EMPLOYEE KANBAN

Each card:

- Avatar
- Employee name
- Job position
- Department
- Email
- Status
- Employee ID
- Quick actions

Actions:

```text
View
Edit
```

View must open the correct employee.

---

# 24. EMPLOYEE LIST

Columns:

- Employee
- Employee ID
- Email
- Job Position
- Department
- Status
- Contract Status
- Actions

Toolbar:

- New
- Import
- Search
- Filters
- Sort
- View switcher

---

# 25. EMPLOYEE FORM

Show:

- Employee identity
- Work information
- Private information
- HR information
- Contract information
- Related records

Smart buttons:

```text
Contracts
Attendance
Time Off
Allocations
Payslips
```

For admin users, show all authorized buttons.

For employees, show only their own authorized information.

---

# 26. CONTRACTS

Routes:

`Employees → Contracts`

Required:

- List
- Form

## Contract List

Columns:

- Contract Reference
- Employee
- Start Date
- End Date
- Wage
- Job Position
- Status

Statuses:

- Draft
- Running
- Expired

The Running contract must be visually obvious.

---

# 27. WORKING SCHEDULES

Routes:

`Employees → Working Schedules`

Required:

- List
- Form

Include:

- Schedule Name
- Company
- Days/Week
- Hours/Week
- Timezone
- Weekly working hours

Weekly schedule table:

- Day
- Start
- End
- Break
- Hours

---

# 28. ATTENDANCE

Route:

`Attendance`

Required:

- List
- Form

Columns:

- Employee
- Date
- Check In
- Check Out
- Worked Hours
- Status

Actions:

```text
Check In
Check Out
Edit
View
```

Employee smart button:

`Employee → Attendance`

must open filtered records for that employee.

---

# 29. TIME OFF

Main navigation:

```text
Time Off ▼
├── Dashboard
├── Requests
├── Allocations
└── Time Off Types
```

---

# 30. TIME OFF REQUESTS

List columns:

- Employee
- Time Off Type
- Start Date
- End Date
- Duration
- Status

Form:

- Employee
- Time Off Type
- Start Date
- End Date
- Number of Days
- Reason
- Available Balance
- Status

Flow:

```text
Draft
 ↓
Submitted
 ↓
Approved / Refused
```

---

# 31. TIME OFF ALLOCATIONS

List:

- Employee
- Time Off Type
- Allocated
- Used
- Remaining
- Status

Balance logic:

```text
Remaining =
Approved Allocation
-
Approved Time Off
```

Only approved allocations create available balance.

---

# 32. TIME OFF TYPES

Include:

- Name
- Description
- Requires Allocation
- Payroll / Work Entry behavior
- Status

Time Off Types define the behavior of leave requests.

---

# 33. PAYROLL

Payroll navigation:

```text
Payroll ▼
├── Dashboard
├── Payruns
├── Payslips
├── Salary Structures
└── Salary Rules
```

---

# 34. PAYRUN CREATION

This MUST be a two-step process.

## Step 1 — Payroll Scope

Fields:

- Payroll Period
- Employee Type
- Salary Structure
- Department if supported
- Company if supported

Button:

`Continue`

### Critical rule

`Continue` must NOT create the Payrun.

---

# 35. PAYRUN EMPLOYEE SELECTION

Show eligible employees.

Fields:

- Checkbox
- Employee
- Department
- Employee Type
- Active Contract
- Salary Structure

Actions:

```text
Select All
Clear
Create Payrun
```

Only selected employees should be included.

---

# 36. PAYRUN LIST

Columns:

- Payrun
- Period
- Employee Count
- Salary Structure
- Total Payroll
- Status
- Warnings

Statuses:

- Draft
- Computed
- Validated
- Paid

---

# 37. PAYRUN DETAIL

Show:

- Payrun name
- Period
- Employee count
- Salary structure
- Total payroll
- Status
- Warnings

Actions:

```text
Compute
Validate
Mark Paid
Send Payslips
```

Flow:

```text
Draft
 ↓
Compute
 ↓
Validated
 ↓
Paid
```

---

# 38. PAYSLIPS

List columns:

- Employee
- Period
- Salary Structure
- Gross Salary
- Deductions
- Net Salary
- Status
- Actions

Payslip Form:

- Employee
- Contract
- Pay Period
- Salary Structure
- Worked Days
- Attendance/work entries
- Leave
- Salary Lines
- Gross Salary
- Deductions
- Net Salary

Actions:

```text
Print Payslip
Download PDF
```

---

# 39. SALARY STRUCTURES

List:

- Structure Name
- Rule Count
- Employee Count
- Active

Form:

- Structure Name
- Structure Type
- Active
- Salary Rules
- Notes

---

# 40. SALARY RULES

List:

- Rule Name
- Code
- Category
- Salary Structure
- Sequence
- Computation Method

Form:

- Rule Name
- Code
- Category
- Structure
- Sequence
- Computation Method
- Amount
- Percentage
- Formula/code if supported

Example rule sequence:

```text
1   Basic Salary
10  HRA
20  Standard Allowance
30  Performance Bonus
40  LTA
50  Fixed Allowance
60  Gross Salary
70  LWF
80  Provident Fund
90  ESIC
100 Professional Tax
110 Net Salary
```

Sequence must be clearly visible.

---

# 41. PAYROLL CALCULATION FLOW

The frontend must reflect:

```text
Employee
   ↓
Applicable Contract
   ↓
Salary Structure
   ↓
Salary Rules
   ↓
Payrun
   ↓
Payslip
   ↓
Salary Computation
   ↓
Gross Salary
   ↓
Deductions
   ↓
Net Salary
```

Do not implement salary calculations separately in the frontend if the backend already performs them.

The frontend should display backend-calculated results.

---

# 42. PAYROLL DASHBOARD

Show:

## KPI Cards

- Total Net Salary Paid
- Payslips Generated
- Average Salary
- Approved Time Off Days
- Attendance Health

## Charts

- Salary Cost by Department
- Monthly Net Salary Trend
- Payslip Status
- Attendance Overview
- Time Off Overview

## Tables

- Department Overview
- Payroll Alerts
- Employee Payroll Summary

Do not hardcode production values.

Use real API/database data wherever available.

---

# 43. REPORTS

Add a Reports section if the existing backend/data supports it.

Possible reports:

- Employee Report
- Attendance Report
- Time Off Report
- Payroll Report
- Payslip Report
- Department Salary Report

Provide:

- Date/period filters
- Department filters
- Employee filters
- Export where supported

---

# 44. ROLE-BASED ACCESS MATRIX

## ADMIN

| Feature | Admin |
|---|---|
| Admin Dashboard | YES |
| Employee List | YES |
| Employee Details | YES |
| Add Employee | YES |
| Edit Employee | YES |
| Delete/Archive Employee | YES, if backend supports |
| CSV Import | YES |
| Contracts | YES |
| Attendance | YES |
| Time Off | YES |
| Allocations | YES |
| Time Off Types | YES |
| Payroll Dashboard | YES |
| Payruns | YES |
| Payslips | YES |
| Salary Structures | YES |
| Salary Rules | YES |
| Reports | YES |
| User Management | YES |
| System Settings | YES |

## EMPLOYEE

| Feature | Employee |
|---|---|
| Employee Dashboard | YES |
| My Profile | YES |
| View Own Attendance | YES |
| Check In/Out | YES |
| Request Time Off | YES |
| View Own Allocations | YES |
| View Own Payslips | YES |
| Download Own Payslip | YES |
| View Own Contract | YES |
| View Other Employees | NO |
| Add Employee | NO |
| CSV Import | NO |
| Edit Other Employees | NO |
| Payroll Administration | NO |
| Salary Rules | NO |
| Salary Structures | NO |
| Payrun Management | NO |
| User Management | NO |
| System Settings | NO |

---

# 45. ROUTING REQUIREMENTS

Use the project's existing router.

Expected logical routes:

```text
/login

/admin
/admin/dashboard

/employees
/employees/new
/employees/:id
/employees/:id/edit

/contracts
/contracts/new
/contracts/:id

/working-schedules
/working-schedules/new
/working-schedules/:id

/attendance
/attendance/:id

/time-off
/time-off/requests
/time-off/requests/new
/time-off/requests/:id
/time-off/allocations
/time-off/allocations/new
/time-off/types
/time-off/types/new

/payroll
/payroll/dashboard
/payroll/payruns
/payroll/payruns/new
/payroll/payruns/:id
/payroll/payslips
/payroll/payslips/:id
/payroll/salary-structures
/payroll/salary-structures/:id
/payroll/salary-rules
/payroll/salary-rules/:id

/my-dashboard
/my-profile
/my-attendance
/my-time-off
/my-payslips
/my-contract
```

Adapt these routes to the existing application instead of creating duplicate routing systems.

---

# 46. NAVIGATION BUG PREVENTION

Every navigation button must be tested.

Especially:

```text
View Employee
Edit Employee
Add Employee
Import Employees
View Attendance
View Time Off
View Payslip
Create Payrun
View Payrun
View Contract
View Salary Structure
View Salary Rule
```

No button should exist only for visual purposes.

Every button must either:

- Navigate
- Submit
- Open modal
- Trigger API action
- Download/export
- Perform its explicitly intended action

---

# 47. ERROR HANDLING

Every API operation needs:

## Loading state

Example:

`Saving employee...`

## Success state

Example:

`Employee created successfully.`

## Error state

Example:

`Unable to create employee. Please check the highlighted fields.`

## Network failure

Example:

`Unable to connect to the server. Please try again.`

Do not leave the UI in an infinite loading state.

---

# 48. FORMS

All forms must:

- Validate required fields
- Show inline errors
- Preserve user input
- Disable submit while saving
- Prevent duplicate submissions
- Show success feedback
- Show API errors
- Support Cancel
- Return to the correct parent page
- Load existing values correctly when editing

---

# 49. TABLES

Every major table should support:

- Search
- Filters
- Sorting
- Pagination where necessary
- Loading state
- Empty state
- Error state
- Row actions
- Responsive layout

---

# 50. RESPONSIVE UI

The application must work on:

- Desktop
- Laptop
- Tablet
- Mobile

### Mobile

- Collapsible navbar
- Stacked cards
- Horizontally scrollable complex tables
- Full-width forms
- Accessible buttons
- No overlapping elements

---

# 51. DESIGN SYSTEM

Keep the UI visually consistent.

Use:

- Consistent typography
- Consistent spacing
- Consistent border radius
- Consistent buttons
- Consistent inputs
- Consistent status badges
- Consistent table styling
- Consistent cards
- Consistent modals

The design should feel like a modern professional HR SaaS product.

Do not make every page look like a separate application.

---

# 52. STATUS BADGES

Use semantic statuses.

Positive:

```text
Active
Running
Approved
Paid
Validated
Done
```

Neutral:

```text
Draft
Pending
Submitted
```

Warning:

```text
Warning
Expiring
Missing Information
```

Negative:

```text
Refused
Expired
Inactive
Failed
```

Status must be readable from text, not only color.

---

# 53. SECURITY REQUIREMENTS

Do NOT rely only on hiding buttons for security.

Frontend role checks are for UX.

Backend authorization must remain authoritative.

Never expose:

- Other employees' sensitive data
- Admin APIs
- Payroll administration
- Salary configuration
- User management

to ordinary employees if the backend does not authorize them.

Do not put secrets/API keys in frontend code.

Do not create a fake frontend-only admin login that bypasses the actual authentication system.

---

# 54. API / BACKEND COMPATIBILITY

Before creating a new API:

1. Search the repository for an existing API/service.
2. Reuse it if available.
3. Check request/response format.
4. Check error handling.
5. Check authentication.
6. Check existing types/interfaces.

Only add or modify backend endpoints if absolutely necessary to make a required feature functional.

If a backend change is required, make the smallest compatible change and document it.

---

# 55. DO NOT USE FAKE DATA WHEN REAL DATA EXISTS

Do not replace real data with:

```javascript
const employees = [...]
```

or:

```javascript
const payroll = 1840000;
```

if the application already has APIs/database data.

Mock data may only be used when:

- The backend endpoint genuinely does not exist yet.
- It is clearly isolated as fallback/demo data.
- It does not overwrite or interfere with real data.

---

# 56. SPECIFIC DEBUGGING TASKS

Before finishing, explicitly debug these:

### Employee Details

Test:

```text
Employees
 → employee card
 → View
 → correct Employee Details
```

Test:

```text
Admin Dashboard
 → employee row
 → View
 → correct Employee Details
```

Test:

```text
Search
 → employee
 → View
 → correct Employee Details
```

### Add Employee

Test:

```text
Add Employee
 → Fill form
 → Submit
 → API succeeds
 → Employee appears
 → View Employee works
```

### CSV

Test:

```text
Import Employees
 → Choose CSV
 → Parse
 → Validate
 → Preview
 → Import
 → Employees appear
```

### Login

Test:

```text
Admin credentials
 → Admin Dashboard

Employee credentials
 → Employee Dashboard
```

Test unauthorized access by manually entering admin routes as an employee.

---

# 57. EMPLOYEE CRUD

Ensure these operations work for authorized admins:

```text
CREATE
READ
UPDATE
ARCHIVE/DELETE
```

At minimum:

- Create employee
- View employee
- Edit employee

must work end-to-end.

---

# 58. ACCEPTANCE CHECKLIST

## Authentication

- [ ] Login page works
- [ ] Admin login works
- [ ] Employee login works
- [ ] Role-based redirect works
- [ ] Employee cannot access admin routes
- [ ] Admin can access admin routes
- [ ] Logout works

## Employee

- [ ] Employee Kanban works
- [ ] Employee List works
- [ ] Employee Form works
- [ ] View Employee Details button works
- [ ] Edit Employee works
- [ ] Add Employee works
- [ ] Employee appears after creation
- [ ] Employee smart buttons work

## CSV

- [ ] Import button works
- [ ] CSV file picker works
- [ ] Drag/drop works if implemented
- [ ] CSV parses correctly
- [ ] Headers validate
- [ ] Rows validate
- [ ] Preview works
- [ ] Import works
- [ ] Invalid rows are clearly reported
- [ ] Imported employees appear in Employee List

## Contracts

- [ ] Contract List
- [ ] Contract Form
- [ ] Running status
- [ ] Employee relationship

## Attendance

- [ ] Attendance List
- [ ] Attendance Form
- [ ] Check In
- [ ] Check Out
- [ ] Employee filtering

## Time Off

- [ ] Requests
- [ ] Allocations
- [ ] Time Off Types
- [ ] Approval state
- [ ] Balance display

## Payroll

- [ ] Payrun creation
- [ ] Employee selection
- [ ] Payrun List
- [ ] Payrun Detail
- [ ] Compute
- [ ] Validate
- [ ] Mark Paid
- [ ] Payslip List
- [ ] Payslip Detail
- [ ] PDF
- [ ] Send Payslips
- [ ] Salary Structures
- [ ] Salary Rules

## Dashboards

- [ ] Admin Dashboard
- [ ] Employee Dashboard
- [ ] Payroll Dashboard
- [ ] Real data
- [ ] Working KPI cards
- [ ] Working quick actions
- [ ] Working alerts
- [ ] Responsive layout

## UX

- [ ] No dead buttons
- [ ] No broken routes
- [ ] No blank pages
- [ ] No infinite loading states
- [ ] No unnecessary duplicate pages
- [ ] No console errors introduced
- [ ] No TypeScript errors
- [ ] Responsive desktop
- [ ] Responsive mobile

---

# 59. IMPLEMENTATION ORDER

Do NOT attempt random changes.

Implement in this order:

## PHASE 1 — Audit

- Inspect repository
- Map routes
- Map APIs
- Map components
- Identify broken buttons
- Identify missing pages
- Identify existing auth

## PHASE 2 — Critical Bugs

Fix:

1. View Employee Details
2. Add Employee
3. CSV upload/import
4. Admin/Employee authentication

## PHASE 3 — Role-Based UX

Implement:

1. Admin Dashboard
2. Employee Dashboard
3. Admin navbar
4. Employee navbar
5. Role-based route protection

## PHASE 4 — HR Modules

Complete:

1. Employees
2. Contracts
3. Working Schedules
4. Attendance
5. Time Off

## PHASE 5 — Payroll

Complete:

1. Payrun
2. Payslips
3. Salary Structures
4. Salary Rules
5. Payroll Dashboard

## PHASE 6 — Polish

Implement:

- Responsive UI
- Loading states
- Empty states
- Error states
- Toasts
- Validation
- Consistent styling
- Accessibility
- Navigation cleanup

## PHASE 7 — QA

Run through every acceptance checklist item.

---

# 60. IMPORTANT COPILOT BEHAVIOR

When you start:

### DO

- Inspect before modifying.
- Search for existing implementations.
- Reuse components.
- Reuse APIs.
- Preserve backend behavior.
- Fix root causes instead of masking symptoms.
- Keep code maintainable.
- Keep types accurate.
- Test each feature after implementing it.
- Check browser console errors.
- Check network/API errors.
- Verify route parameters.
- Verify authenticated user roles.
- Verify that created records actually persist.

### DO NOT

- Do not rewrite the entire application.
- Do not delete working features.
- Do not create fake buttons.
- Do not hardcode employee IDs.
- Do not hardcode dashboard values when APIs exist.
- Do not create frontend-only security.
- Do not bypass authentication.
- Do not expose admin features to employees.
- Do not silently swallow API errors.
- Do not create duplicate components unnecessarily.
- Do not leave TODO buttons in the final UI.
- Do not claim a feature works without testing the actual flow.

---

# 61. FINAL DELIVERABLE

After completing the changes:

1. Ensure the application builds successfully.
2. Ensure there are no new TypeScript/lint errors.
3. Ensure all routes work.
4. Ensure all critical buttons work.
5. Ensure Admin and Employee experiences are clearly separated.
6. Ensure Add Employee works end-to-end.
7. Ensure CSV import works end-to-end.
8. Ensure View Employee Details works everywhere.
9. Ensure payroll flows remain functional.
10. Ensure the UI is responsive.

Finally, provide a concise implementation summary containing:

```text
FIXED
- ...

ADDED
- ...

MODIFIED
- ...

BACKEND CHANGES
- None / list only if genuinely required

KNOWN LIMITATIONS
- None / list actual limitations

TESTED
- ...
```

## FINAL PRIORITY

If there is a conflict between visual polish and functionality:

```text
FUNCTIONALITY
    ↓
DATA CORRECTNESS
    ↓
AUTHORIZATION / SECURITY
    ↓
NAVIGATION
    ↓
RESPONSIVE UX
    ↓
VISUAL POLISH
```

The final application must be a **fully connected HRMS frontend**, not a static UI prototype.
