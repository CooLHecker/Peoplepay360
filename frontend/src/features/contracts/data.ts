import type { Contract } from "@/types";

export const demoContracts: Contract[] = [
  { id: "CON-1", employeeId: "EMP-1042", employeeName: "Sarah Jenkins", department: "Product", jobPosition: "Product Designer", salaryStructureId: "SS-IN-MONTHLY", wage: 95000, startDate: "2024-01-15", endDate: null, status: "running" },
  { id: "CON-2", employeeId: "EMP-1041", employeeName: "Marcus Chen", department: "Engineering", jobPosition: "Senior Engineer", salaryStructureId: "SS-IN-MONTHLY", wage: 145000, startDate: "2023-06-01", endDate: null, status: "running" },
  { id: "CON-3", employeeId: "EMP-1040", employeeName: "Priya Shah", department: "People", jobPosition: "People Partner", salaryStructureId: "SS-IN-MONTHLY", wage: 110000, startDate: "2023-03-10", endDate: null, status: "running" }
];

export function findDemoContract(id: string) {
  return demoContracts.find((contract) => contract.id === id);
}
