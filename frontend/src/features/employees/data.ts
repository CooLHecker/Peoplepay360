import type { Employee } from "@/types";

export const demoEmployees: Employee[] = [
  { id: "EMP-1042", fullName: "Sarah Jenkins", workEmail: "sarah.jenkins@interloop.test", phoneNumber: "+91 98765 43210", location: "Gandhinagar, India", departmentId: "Product", positionId: "Product Designer", dateOfJoining: "2024-01-15", employmentStatus: "active" },
  { id: "EMP-1041", fullName: "Marcus Chen", workEmail: "marcus.chen@interloop.test", phoneNumber: "+91 98765 43211", location: "Gandhinagar, India", departmentId: "Engineering", positionId: "Senior Engineer", dateOfJoining: "2023-06-01", employmentStatus: "active" },
  { id: "EMP-1040", fullName: "Priya Shah", workEmail: "priya.shah@interloop.test", phoneNumber: "+91 98765 43212", location: "Gandhinagar, India", departmentId: "People", positionId: "People Partner", dateOfJoining: "2023-03-10", employmentStatus: "active" },
  { id: "EMP-1039", fullName: "Daniel Okafor", workEmail: "daniel.okafor@interloop.test", phoneNumber: "+91 98765 43213", location: "Gandhinagar, India", departmentId: "Finance", positionId: "Finance Lead", dateOfJoining: "2022-11-20", employmentStatus: "active" },
  { id: "EMP-1038", fullName: "Elena Rossi", workEmail: "elena.rossi@interloop.test", phoneNumber: "+91 98765 43214", location: "Gandhinagar, India", departmentId: "Marketing", positionId: "Content Strategist", dateOfJoining: "2022-05-02", employmentStatus: "inactive" }
];

export function findDemoEmployee(id: string) {
  return demoEmployees.find((employee) => employee.id === id);
}
