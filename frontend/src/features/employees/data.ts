import type { Employee } from "@/types";

export const demoEmployees: Employee[] = [
  { id: "EMP-1042", fullName: "Sarah Jenkins", departmentId: "Product", positionId: "Product Designer", employmentStatus: "active" },
  { id: "EMP-1041", fullName: "Marcus Chen", departmentId: "Engineering", positionId: "Senior Engineer", employmentStatus: "active" },
  { id: "EMP-1040", fullName: "Priya Shah", departmentId: "People", positionId: "People Partner", employmentStatus: "active" },
  { id: "EMP-1039", fullName: "Daniel Okafor", departmentId: "Finance", positionId: "Finance Lead", employmentStatus: "active" },
  { id: "EMP-1038", fullName: "Elena Rossi", departmentId: "Marketing", positionId: "Content Strategist", employmentStatus: "inactive" }
];

export function findDemoEmployee(id: string) {
  return demoEmployees.find((employee) => employee.id === id);
}
