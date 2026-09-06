import type { TimeOffBalance, TimeOffRequest, TimeOffSummary, TimeOffType } from "@/types";

export const demoTimeOffTypes: TimeOffType[] = [
  { id: "TOT-1", name: "Annual leave", description: "Paid yearly leave allocation.", requiresAllocation: true, workEntryBehavior: "paid", isActive: true },
  { id: "TOT-2", name: "Sick leave", description: "Paid leave for illness.", requiresAllocation: false, workEntryBehavior: "paid", isActive: true },
  { id: "TOT-3", name: "Personal day", description: "Unpaid personal time off.", requiresAllocation: false, workEntryBehavior: "unpaid", isActive: true }
];

export const demoTimeOffRequests: TimeOffRequest[] = [
  { id: "LV-204", employeeId: "EMP-1042", employeeName: "Sarah Jenkins", timeOffTypeId: "TOT-1", timeOffTypeName: "Annual leave", startDate: "2026-09-12", endDate: "2026-09-16", numberOfDays: 5, reason: null, availableBalance: 9, status: "submitted" },
  { id: "LV-203", employeeId: "EMP-1041", employeeName: "Marcus Chen", timeOffTypeId: "TOT-3", timeOffTypeName: "Personal day", startDate: "2026-09-09", endDate: "2026-09-09", numberOfDays: 1, reason: null, availableBalance: null, status: "submitted" },
  { id: "LV-202", employeeId: "EMP-1040", employeeName: "Priya Shah", timeOffTypeId: "TOT-1", timeOffTypeName: "Annual leave", startDate: "2026-09-02", endDate: "2026-09-04", numberOfDays: 3, reason: null, availableBalance: 11, status: "approved" },
  { id: "LV-201", employeeId: "EMP-1039", employeeName: "Daniel Okafor", timeOffTypeId: "TOT-2", timeOffTypeName: "Sick leave", startDate: "2026-08-29", endDate: "2026-08-29", numberOfDays: 1, reason: null, availableBalance: null, status: "approved" }
];

export const demoTimeOffSummary: TimeOffSummary = {
  pending: 4,
  approved_this_month: 18,
  days_out_this_week: 7
};

export const demoTimeOffBalance: TimeOffBalance[] = [
  { employeeId: "EMP-1042", employeeName: "Sarah Jenkins", timeOffTypeId: "TOT-1", timeOffTypeName: "Annual leave", allocated: 14, used: 5, remaining: 9 }
];
