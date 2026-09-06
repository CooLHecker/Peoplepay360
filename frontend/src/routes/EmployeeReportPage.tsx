import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeading, Status } from "@/components/ui/PageBits";
import { getApiOr } from "@/lib/api-client";
import { demoEmployees } from "@/features/employees/data";
import type { Employee } from "@/types";

export default function EmployeeReportPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getApiOr<Employee[]>("/employees/", demoEmployees)
      .then(setEmployees)
      .finally(() => setLoading(false));
  }, []);

  const activeCount = useMemo(
    () => employees.filter((employee) => employee.employmentStatus === "active").length,
    [employees]
  );

  return (
    <div className="mx-auto max-w-[1200px]">
      <Link to="/employees" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#714b67]">
        <ArrowLeft size={16} /> Back to employees
      </Link>
      <PageHeading
        eyebrow="People operations / employee report"
        title="Employee summary"
        description="A printable HTML report containing the latest employee records available in PeoplePay."
        action={<FileText size={22} className="text-[#714b67]" />}
      />

      <section className="rounded-xl border border-[#e6e0e5] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#eee9ed] pb-5">
          <div>
            <h2 className="text-lg font-bold text-[#352f37]">All employees</h2>
            <p className="mt-1 text-sm text-[#756c75]">Generated {new Date().toLocaleDateString()}</p>
          </div>
          <div className="flex gap-6 text-right">
            <div><p className="text-xs font-bold uppercase tracking-wider text-[#9c8e99]">Total</p><p className="mt-1 text-2xl font-bold text-[#352f37]">{employees.length}</p></div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-[#9c8e99]">Active</p><p className="mt-1 text-2xl font-bold text-[#27804d]">{activeCount}</p></div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm font-semibold text-[#756c75]"><Loader2 size={16} className="animate-spin" /> Loading employee report...</div>
        ) : employees.length === 0 ? (
          <p className="py-10 text-sm text-[#756c75]">No employee records are available.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-[#eee9ed] text-xs uppercase tracking-wider text-[#9c8e99]">
                <tr><th className="px-3 py-3">Employee</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Department</th><th className="px-3 py-3">Position</th><th className="px-3 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-[#f0ebef]">
                {employees.map((employee) => (
                  <tr key={employee.id} className="text-sm text-[#756c75]">
                    <td className="px-3 py-4"><Link to={`/employees/${employee.id}`} className="font-bold text-[#352f37] hover:text-[#714b67]">{employee.fullName}</Link><span className="mt-1 block text-xs text-[#9c8e99]">{employee.id}</span></td>
                    <td className="px-3 py-4">{employee.workEmail || "Not provided"}</td>
                    <td className="px-3 py-4">{employee.departmentId || "Unassigned"}</td>
                    <td className="px-3 py-4">{employee.positionId || "Unassigned"}</td>
                    <td className="px-3 py-4"><Status>{employee.employmentStatus}</Status></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}