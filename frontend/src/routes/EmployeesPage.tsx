import { CalendarClock, Download, FileText, Plus, Upload, X } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeading, Status, Toolbar } from "@/components/ui/PageBits";
import { apiClient, getApiOr } from "@/lib/api-client";
import type { Employee } from "@/types";

const demoEmployees: Employee[] = [
  { id: "EMP-1042", fullName: "Sarah Jenkins", departmentId: "Product", positionId: "Product Designer", employmentStatus: "active" },
  { id: "EMP-1041", fullName: "Marcus Chen", departmentId: "Engineering", positionId: "Senior Engineer", employmentStatus: "active" },
  { id: "EMP-1040", fullName: "Priya Shah", departmentId: "People", positionId: "People Partner", employmentStatus: "active" },
  { id: "EMP-1039", fullName: "Daniel Okafor", departmentId: "Finance", positionId: "Finance Lead", employmentStatus: "active" }
];
const CSV_HEADERS = "employee_id,name,email,phone,department,job_position,manager,work_location,joining_date,employee_type,employment_status,working_schedule";
const VALID_STATUSES: Employee["employmentStatus"][] = ["active", "inactive", "terminated"];
const SORT_OPTIONS = [
  { label: "Sort: Name (A–Z)", value: "name-asc" },
  { label: "Sort: Name (Z–A)", value: "name-desc" },
  { label: "Sort: Department", value: "department" },
  { label: "Sort: Role", value: "role" },
  { label: "Sort: Status", value: "status" }
];

// Splits one CSV line into cells, honoring double-quoted fields (so
// commas inside quotes, and escaped "" quotes, don't break the parse).
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === "\"" && line[i + 1] === "\"") { current += "\""; i += 1; }
      else if (char === "\"") { inQuotes = false; }
      else { current += char; }
    } else if (char === "\"") { inQuotes = true; }
    else if (char === ",") { cells.push(current.trim()); current = ""; }
    else { current += char; }
  }
  cells.push(current.trim());
  return cells;
}

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>(demoEmployees);
  const [query, setQuery] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [summary, setSummary] = useState("");
  const [importing, setImporting] = useState(false);
  const [sortBy, setSortBy] = useState("name-asc");
  useEffect(() => { void getApiOr<Employee[]>("/employees/", demoEmployees).then(setEmployees); }, []);
  const filtered = useMemo(() => {
    const matches = employees.filter((employee) => `${employee.fullName} ${employee.departmentId} ${employee.positionId}`.toLowerCase().includes(query.toLowerCase()));
    return [...matches].sort((a, b) => {
      switch (sortBy) {
        case "name-desc": return b.fullName.localeCompare(a.fullName);
        case "department": return (a.departmentId ?? "").localeCompare(b.departmentId ?? "") || a.fullName.localeCompare(b.fullName);
        case "role": return (a.positionId ?? "").localeCompare(b.positionId ?? "") || a.fullName.localeCompare(b.fullName);
        case "status": return a.employmentStatus.localeCompare(b.employmentStatus) || a.fullName.localeCompare(b.fullName);
        default: return a.fullName.localeCompare(b.fullName);
      }
    });
  }, [employees, query, sortBy]);
  const importCsv = async (text: string) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) { setSummary("The file is empty."); return; }
    const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
    const missing = ["name", "email"].filter((item) => !headers.includes(item));
    if (missing.length) { setSummary(`Missing required headers: ${missing.join(", ")}`); return; }
    setImporting(true);
    let created = 0;
    let skipped = 0;
    for (const line of lines.slice(1)) {
      const cells = parseCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => { row[header] = (cells[index] ?? "").trim(); });
      if (!row.name || !row.email) { skipped += 1; continue; }
      const employmentStatus = VALID_STATUSES.includes(row.employment_status?.toLowerCase() as Employee["employmentStatus"])
        ? (row.employment_status.toLowerCase() as Employee["employmentStatus"])
        : "active";
      try {
        const saved = await apiClient.post<Employee>("/employees/", {
          full_name: row.name,
          work_email: row.email,
          phone_number: row.phone || null,
          location: row.work_location || null,
          department: row.department || null,
          job_position: row.job_position || null,
          date_of_joining: row.joining_date || null,
          employment_status: employmentStatus
        });
        setEmployees((current) => [saved, ...current]);
      } catch {
        // No backend reachable (offline/demo mode) — add it locally so
        // the import still works, same as the rest of this offline-first app.
        setEmployees((current) => [{
          id: row.employee_id || `EMP-${Date.now()}-${created}`,
          fullName: row.name,
          workEmail: row.email || null,
          phoneNumber: row.phone || null,
          location: row.work_location || null,
          departmentId: row.department || null,
          positionId: row.job_position || null,
          dateOfJoining: row.joining_date || null,
          employmentStatus
        }, ...current]);
      }
      created += 1;
    }
    setImporting(false);
    setSummary(`${created} employee${created === 1 ? "" : "s"} imported.${skipped ? ` ${skipped} row${skipped === 1 ? "" : "s"} skipped (missing name or email).` : ""}`);
  };
  const chooseCsv = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => void importCsv(String(reader.result ?? "")); reader.readAsText(file); event.target.value = ""; };
  const template = () => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([`${CSV_HEADERS}\n`], { type: "text/csv" })); link.download = "interloop-employees-template.csv"; link.click(); URL.revokeObjectURL(link.href); };
  return <div className="mx-auto max-w-[1440px]"><PageHeading eyebrow="People directory" title="Employees" description="Keep your team records accurate, searchable, and ready for payroll." action={<div className="flex gap-2"><Link to="/contracts" className="inline-flex items-center gap-2 rounded-lg border border-[#e6e0e5] bg-white px-4 py-2.5 text-sm font-bold text-[#756c75]"><FileText size={16} />Contracts</Link><Link to="/working-schedules" className="inline-flex items-center gap-2 rounded-lg border border-[#e6e0e5] bg-white px-4 py-2.5 text-sm font-bold text-[#756c75]"><CalendarClock size={16} />Working schedules</Link><button onClick={() => setShowImport(true)} className="inline-flex items-center gap-2 rounded-lg border border-[#e6e0e5] bg-white px-4 py-2.5 text-sm font-bold text-[#756c75]"><Upload size={16} />Import</button><button onClick={() => navigate("/employees/new")} className="inline-flex items-center gap-2 rounded-lg bg-[#714b67] px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />Add employee</button></div>} /><div className="mb-5 grid gap-4 sm:grid-cols-3">{[["All employees", String(employees.length)], ["Active", String(employees.filter((employee) => employee.employmentStatus === "active").length)], ["New this month", "6"]].map(([label, value]) => <div key={label} className="rounded-xl border border-[#e6e0e5] bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#9c8e99]">{label}</p><p className="mt-2 text-2xl font-bold text-[#352f37]">{value}</p></div>)}</div><Toolbar onSearch={setQuery} placeholder="Search by name, department, or role" sortOptions={SORT_OPTIONS} sortValue={sortBy} onSortChange={setSortBy} /><div className="overflow-hidden rounded-xl border border-[#e6e0e5] bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="border-b border-[#eee9ed] bg-[#fbf8fa] text-xs uppercase tracking-wider text-[#9c8e99]"><tr><th className="px-6 py-4">Employee</th><th className="px-6 py-4">Department</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Status</th><th className="px-6 py-4" /></tr></thead><tbody className="divide-y divide-[#f0ebef]">{filtered.map((employee) => <tr key={employee.id}><td className="px-6 py-4"><Link to={`/employees/${employee.id}`} className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#f3edf2] text-xs font-bold text-[#714b67]">{employee.fullName.split(" ").map((part) => part[0]).join("")}</span><span><strong className="block text-sm text-[#352f37]">{employee.fullName}</strong><small className="text-xs text-[#9c8e99]">{employee.id}</small></span></Link></td><td className="px-6 py-4 text-sm text-[#756c75]">{employee.departmentId}</td><td className="px-6 py-4 text-sm text-[#756c75]">{employee.positionId}</td><td className="px-6 py-4"><Status>{employee.employmentStatus === "active" ? "Active" : "Inactive"}</Status></td><td className="px-6 py-4 text-right"><Link to={`/employees/${employee.id}`} className="text-sm font-bold text-[#714b67]">View</Link><Link to={`/employees/${employee.id}/edit`} className="ml-4 text-sm font-bold text-[#714b67]">Edit</Link></td></tr>)}</tbody></table></div></div>{showImport && <div className="fixed inset-0 z-40 grid place-items-center bg-[#25212a]/30 p-4"><section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex justify-between"><div><h2 className="text-xl font-bold text-[#352f37]">Import employees</h2><p className="mt-1 text-sm text-[#9c8e99]">Validate your CSV before importing.</p></div><button onClick={() => setShowImport(false)} aria-label="Close"><X size={18} /></button></div><button onClick={template} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#714b67]"><Download size={16} />Download template</button><label className="mt-5 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-[#d8c4d3] bg-[#fbf8fa] p-8"><Upload className="text-[#714b67]" /><strong className="mt-3 text-sm">{importing ? "Importing…" : "Choose CSV file"}</strong><input type="file" accept=".csv,text/csv" className="hidden" onChange={chooseCsv} disabled={importing} /></label>{summary && <p className="mt-4 rounded-lg bg-[#eef8f2] p-3 text-sm font-semibold text-[#27804d]">{summary}</p>}<button onClick={() => setShowImport(false)} className="mt-6 rounded-lg bg-[#714b67] px-4 py-2.5 text-sm font-bold text-white">Close</button></section></div>}</div>;
}
