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
  startDate: string;
  endDate: string | null;
  wage: number;
  salaryStructureId: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  checkIn: string;
  checkOut: string | null;
  status: "pending" | "confirmed" | "anomaly";
}

export interface TimeOffRequest {
  id: string;
  employeeName: string;
  type: string;
  dates: string;
  days: number;
  status: "Pending" | "Approved" | "Rejected";
}

export interface PayrollRun {
  id: string;
  period: string;
  employees: number;
  gross: number;
  status: "Draft" | "Processing" | "Completed";
}
