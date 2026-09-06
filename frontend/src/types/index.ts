// The fixed role set from the login/access-control spec — mirrors
// RoleName in backend/app/models/role.py.
export type RoleName = "admin" | "hr_manager" | "hr_payroll_user" | "hr_payroll_admin" | "employee";

// A login (User) account together with its assigned roles — mirrors
// UserWithRoles in backend/app/schemas/users.py. Powers the User
// Management / promotion screen.
export interface UserAccount {
  id: number;
  email: string;
  isActive: boolean;
  employeeId: number | null;
  employeeName: string | null;
  roles: RoleName[];
}

export interface RoleOption {
  name: RoleName;
  description: string | null;
}

export interface Employee {
  id: string;
  fullName: string;
  workEmail?: string | null;
  phoneNumber?: string | null;
  location?: string | null;
  departmentId: string | null;
  positionId: string | null;
  dateOfJoining?: string | null;
  employmentStatus: "active" | "inactive" | "terminated";
  hasLoginAccess?: boolean;
}

export interface Contract {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string | null;
  jobPosition: string | null;
  salaryStructureId: string | null;
  wage: number;
  startDate: string;
  endDate: string | null;
  status: "draft" | "running" | "expired" | "cancelled";
}

export interface WorkingSchedule {
  id: string;
  name: string;
  description: string | null;
  isFlexible: boolean;
  hoursPerWeek: number;
  daysPerWeek: number;
  startTime: string | null;
  endTime: string | null;
  timezone: string;
  isActive: boolean;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  checkIn: string;
  checkOut: string | null;
  status: "pending" | "confirmed" | "anomaly";
}

// One employee's row on the admin Attendance dashboard — mirrors
// AttendanceAdminRow in backend/app/schemas/attendance.py. checkInAt /
// checkOutAt are real server timestamps (ISO strings) or null when the
// employee hasn't checked in today, never mock/placeholder text.
export interface AttendanceAdminRow {
  employeeId: string;
  fullName: string;
  workEmail: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: "present" | "late" | "on_leave" | "absent";
}

// Backs AttendancePage.tsx in full — mirrors AttendanceSummaryResponse
// in backend/app/schemas/attendance.py.
export interface AttendanceSummary {
  date: string;
  present: number;
  late: number;
  onLeave: number;
  absent: number;
  rows: AttendanceAdminRow[];
}

export type TimeOffStatus = "draft" | "submitted" | "approved" | "refused";

export interface TimeOffType {
  id: string;
  name: string;
  description: string | null;
  requiresAllocation: boolean;
  workEntryBehavior: "paid" | "unpaid";
  isActive: boolean;
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  timeOffTypeId: string;
  timeOffTypeName: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string | null;
  availableBalance: number | null;
  status: TimeOffStatus;
}

export interface TimeOffBalance {
  employeeId: string;
  employeeName: string;
  timeOffTypeId: string;
  timeOffTypeName: string;
  allocated: number;
  used: number;
  remaining: number;
}

export interface TimeOffSummary {
  pending: number;
  approved_this_month: number;
  days_out_this_week: number;
}

export interface PayrollRun {
  id: string;
  period: string;
  periodYear?: number;
  periodMonth?: number;
  employees: number;
  gross: number;
  status: "Draft" | "Processing" | "Completed";
}

export interface Payslip {
  id: string;
  employeeId: string;
  employeeName: string;
  contractId: string | null;
  periodYear: number;
  periodMonth: number;
  period: string;
  grossSalary: number;
  netSalary: number;
  status: "generated" | "paid";
  generatedAt: string;
}

// Backs DashboardPage.tsx (the admin home) in full — mirrors
// DashboardSummaryResponse in backend/app/schemas/dashboard.py.
export interface DashboardWorkforceBreakdown {
  active: number;
  inactive: number;
  terminated: number;
  onLeaveToday: number;
}

export interface DashboardPayrollStatus {
  periodLabel: string;
  periodYear: number;
  periodMonth: number;
  totalGross: number;
  status: "completed" | "pending";
}

export interface DashboardRecentActivityItem {
  id: string;
  actorName: string;
  detail: string;
  initials: string;
  occurredAt: string;
}

export interface DashboardSummary {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  onLeaveToday: number;
  absentToday: number;
  pendingTimeOff: number;
  attendanceRateThisMonth: number | null;
  workforce: DashboardWorkforceBreakdown;
  payroll: DashboardPayrollStatus;
  missingDetailsCount: number;
  activeWorkingSchedules: number;
  recentActivity: DashboardRecentActivityItem[];
}
