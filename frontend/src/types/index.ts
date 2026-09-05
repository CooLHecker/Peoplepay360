export interface Employee {
  id: string;
  fullName: string;
  workEmail?: string | null;
  departmentId: string | null;
  positionId: string | null;
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
  employees: number;
  gross: number;
  status: "Draft" | "Processing" | "Completed";
}
