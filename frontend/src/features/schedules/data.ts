import type { WorkingSchedule } from "@/types";

export const demoSchedules: WorkingSchedule[] = [
  { id: "1", name: "Standard 40 hours", description: "Standard fixed weekday schedule", isFlexible: false, hoursPerWeek: 40, daysPerWeek: 5, startTime: "09:00:00", endTime: "18:00:00", timezone: "Asia/Kolkata", isActive: true },
  { id: "2", name: "Flexible product schedule", description: null, isFlexible: true, hoursPerWeek: 40, daysPerWeek: 5, startTime: null, endTime: null, timezone: "Asia/Kolkata", isActive: true }
];

export function findDemoSchedule(id: string) {
  return demoSchedules.find((schedule) => schedule.id === id);
}
