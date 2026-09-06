import { ArrowLeft, BriefcaseBusiness, CalendarDays, FileText, KeyRound, Mail, MapPin, Pencil, Phone, UserRound, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeading, Status } from "@/components/ui/PageBits";
import { apiClient } from "@/lib/api-client";
import { findDemoEmployee } from "@/features/employees/data";
import type { Employee } from "@/types";
import type { ReactNode } from "react";

export default function EmployeeDetailsPage() {
  const { employeeId = "" } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setEmployee(undefined);
    apiClient
      .get<Employee>(`/employees/${employeeId}`)
      .then((result) => { if (!cancelled) setEmployee(result); })
      .catch(() => { if (!cancelled) setEmployee(findDemoEmployee(employeeId) ?? null); });
    return () => { cancelled = true; };
  }, [employeeId]);

  if (employee === undefined) return <div className="mx-auto max-w-3xl rounded-xl border border-[#e6e0e5] bg-white p-8 text-sm text-[#9c8e99]">Loading employee...</div>;
  if (!employee) return <div className="mx-auto max-w-3xl rounded-xl border border-[#e6e0e5] bg-white p-8"><h1 className="text-xl font-bold text-[#352f37]">Employee not found</h1><Link className="mt-4 inline-block text-sm font-bold text-[#714b67]" to="/employees">Back to employees</Link></div>;

  const initials = employee.fullName.split(" ").map((part) => part[0]).join("");
  const smartButtons: [string, string, LucideIcon][] = [["Contracts", "contracts", FileText], ["Attendance", "attendance", CalendarDays], ["Time off", "time-off", BriefcaseBusiness], ["Allocations", "time-off", FileText]];
  const joiningDate = employee.dateOfJoining
    ? new Date(employee.dateOfJoining).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "Not set";
  return <div className="mx-auto max-w-[1100px]"><button onClick={() => navigate("/employees")} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#714b67]"><ArrowLeft size={16} /> Back to employees</button><PageHeading eyebrow="Employee profile" title={employee.fullName} description={`${employee.positionId ?? "Unassigned role"} · ${employee.departmentId ?? "Unassigned department"}`} action={<button onClick={() => navigate(`/employees/${employee.id}/edit`)} className="inline-flex items-center gap-2 rounded-lg bg-[#714b67] px-4 py-2.5 text-sm font-bold text-white"><Pencil size={16} /> Edit employee</button>} /><div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]"><section className="rounded-xl border border-[#e6e0e5] bg-white p-6"><div className="flex items-center gap-4"><span className="grid h-16 w-16 place-items-center rounded-full bg-[#f3edf2] text-xl font-bold text-[#714b67]">{initials}</span><div><h2 className="text-xl font-bold text-[#352f37]">{employee.fullName}</h2><p className="text-sm text-[#9c8e99]">{employee.id}</p><div className="mt-2 flex flex-wrap gap-2"><Status>{employee.employmentStatus === "active" ? "Active" : employee.employmentStatus === "inactive" ? "Inactive" : "Terminated"}</Status>{employee.hasLoginAccess !== undefined && <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${employee.hasLoginAccess ? "bg-[#eef8f2] text-[#27804d]" : "bg-[#fff7e7] text-[#a36b12]"}`}><KeyRound size={12} /> {employee.hasLoginAccess ? "Login enabled" : "No login access"}</span>}</div></div></div><div className="mt-7 space-y-4 text-sm"><p className="flex items-center gap-3 text-[#756c75]"><Mail size={17} className="text-[#714b67]" /> {employee.workEmail ?? "No work email on file"}</p><p className="flex items-center gap-3 text-[#756c75]"><Phone size={17} className="text-[#714b67]" /> {employee.phoneNumber ?? "No phone number on file"}</p><p className="flex items-center gap-3 text-[#756c75]"><MapPin size={17} className="text-[#714b67]" /> {employee.location ?? "No location on file"}</p></div></section><section className="rounded-xl border border-[#e6e0e5] bg-white p-6"><h2 className="text-lg font-bold text-[#352f37]">Work information</h2><div className="mt-5 grid gap-5 sm:grid-cols-2"><Info icon={<BriefcaseBusiness size={17} />} label="Department" value={employee.departmentId ?? "Unassigned"} /><Info icon={<UserRound size={17} />} label="Job position" value={employee.positionId ?? "Unassigned"} /><Info icon={<CalendarDays size={17} />} label="Joining date" value={joiningDate} /><Info icon={<MapPin size={17} />} label="Location" value={employee.location ?? "Not set"} /></div></section></div><div className="mt-6 grid gap-4 sm:grid-cols-4">{smartButtons.map(([label, path, Icon]) => <Link key={label} to={`/${path}?employee=${employee.id}`} className="flex items-center gap-3 rounded-xl border border-[#e6e0e5] bg-white p-4 text-sm font-bold text-[#714b67] hover:border-[#714b67]"> <Icon size={18} />{label}</Link>)}</div></div>;
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9c8e99]">{icon}{label}</p><p className="mt-2 text-sm font-semibold text-[#352f37]">{value}</p></div>; }
