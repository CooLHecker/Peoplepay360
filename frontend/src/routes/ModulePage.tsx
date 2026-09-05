import { ArrowLeft, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { PageHeading, Status, Toolbar } from "@/components/ui/PageBits";

const content: Record<string, { title: string; eyebrow: string; description: string; rows: string[] }> = {
  contracts: { title: "Contracts", eyebrow: "Employees / contracts", description: "Manage employee agreements, dates, wages, and running status.", rows: ["Sarah Jenkins · Product Designer · Running", "Marcus Chen · Senior Engineer · Running", "Priya Shah · People Partner · Running"] },
  schedules: { title: "Working schedules", eyebrow: "Employees / schedules", description: "Define the working patterns used by your teams.", rows: ["Standard 40 hours · 5 days/week · Asia/Kolkata", "Flexible product schedule · 5 days/week · Asia/Kolkata"] },
  requests: { title: "Time-off requests", eyebrow: "Time off / requests", description: "Review submitted leave requests and approvals.", rows: ["Sarah Jenkins · Annual leave · Pending", "Marcus Chen · Personal day · Pending", "Priya Shah · Annual leave · Approved"] },
  allocations: { title: "Time-off allocations", eyebrow: "Time off / allocations", description: "Track allocated, used, and remaining leave balances.", rows: ["Sarah Jenkins · Annual leave · 14 days remaining", "Marcus Chen · Annual leave · 10 days remaining"] },
  types: { title: "Time-off types", eyebrow: "Time off / configuration", description: "Configure the leave types available to employees.", rows: ["Annual leave · Allocation required · Active", "Sick leave · Allocation not required · Active"] },
  payruns: { title: "Payruns", eyebrow: "Payroll / payruns", description: "Compute, validate, and pay employee payroll runs.", rows: ["September 2026 · 124 employees · Draft", "August 2026 · 124 employees · Paid"] },
  payslips: { title: "Payslips", eyebrow: "Payroll / payslips", description: "Review generated payslips and salary lines.", rows: ["Sarah Jenkins · August 2026 · Paid", "Marcus Chen · August 2026 · Paid"] },
  structures: { title: "Salary structures", eyebrow: "Payroll / configuration", description: "Manage the structures applied to employee contracts.", rows: ["India Monthly Payroll · 18 rules · Active", "Executive Payroll · 22 rules · Active"] },
  rules: { title: "Salary rules", eyebrow: "Payroll / configuration", description: "Review the ordered rules used in salary computation.", rows: ["Basic Salary · BASIC · Sequence 1", "House Rent Allowance · HRA · Sequence 10", "Provident Fund · PF · Sequence 80"] },
  reports: { title: "Reports", eyebrow: "People operations", description: "Export employee, attendance, time-off, and payroll reports.", rows: ["Employee report · Updated today", "Attendance report · September 2026", "Payroll report · August 2026"] }
};

export default function ModulePage({ module }: { module: keyof typeof content }) {
  const location = useLocation();
  const page = content[module];
  return <div className="mx-auto max-w-[1200px]"><Link to={location.pathname.includes("payroll") ? "/payroll" : "/"} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#714b67]"><ArrowLeft size={16} /> Back</Link><PageHeading eyebrow={page.eyebrow} title={page.title} description={page.description} action={<button className="inline-flex items-center gap-2 rounded-lg bg-[#714b67] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} /> New</button>} /><Toolbar onSearch={() => undefined} placeholder={`Search ${page.title.toLowerCase()}`} /><div className="overflow-hidden rounded-xl border border-[#e6e0e5] bg-white"><div className="divide-y divide-[#f0ebef]">{page.rows.map((row) => <div key={row} className="flex items-center justify-between gap-4 p-5"><p className="text-sm font-semibold text-[#352f37]">{row}</p><Status>{row.includes("Paid") || row.includes("Running") || row.includes("Active") || row.includes("Approved") ? "Active" : "Draft"}</Status></div>)}</div></div></div>;
}
