import { ArrowLeft, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeading, Status, Toolbar, money } from "@/components/ui/PageBits";
import { apiClient } from "@/lib/api-client";
import { demoContracts } from "@/features/contracts/data";
import type { Contract } from "@/types";

const STATUS_LABEL: Record<Contract["status"], string> = {
  draft: "Draft",
  running: "Running",
  expired: "Expired",
  cancelled: "Cancelled"
};

export default function ContractsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get("employee");

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const path = employeeId ? `/contracts/?employee_id=${employeeId}` : "/contracts/";
    apiClient
      .get<Contract[]>(path)
      .then((result) => { if (!cancelled) setContracts(result); })
      .catch((err) => {
        if (cancelled) return;
        setContracts(employeeId ? demoContracts.filter((contract) => contract.employeeId === employeeId) : demoContracts);
        setError(err instanceof Error ? err.message : "Showing offline sample data — check the API connection.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [employeeId]);

  const filtered = useMemo(
    () => contracts.filter((contract) => `${contract.employeeName} ${contract.department ?? ""} ${contract.jobPosition ?? ""}`.toLowerCase().includes(query.toLowerCase())),
    [contracts, query]
  );

  const newContractHref = employeeId ? `/contracts/new?employee=${employeeId}` : "/contracts/new";

  return <div className="mx-auto max-w-[1300px]">
    {employeeId && <Link to={`/employees/${employeeId}`} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#714b67]"><ArrowLeft size={16} /> Back to employee</Link>}
    <PageHeading eyebrow="Employees / contracts" title="Contracts" description="Manage employee agreements, dates, wages, and running status." action={<button onClick={() => navigate(newContractHref)} className="inline-flex items-center gap-2 rounded-lg bg-[#714b67] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} /> New contract</button>} />
    {error && <p className="mb-4 rounded-lg bg-[#fff7e7] p-3 text-sm font-semibold text-[#a36b12]">{error}</p>}
    <Toolbar onSearch={setQuery} placeholder="Search by employee, department, or role" />
    <div className="overflow-hidden rounded-xl border border-[#e6e0e5] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left">
          <thead className="border-b border-[#eee9ed] bg-[#fbf8fa] text-xs uppercase tracking-wider text-[#9c8e99]">
            <tr>
              <th className="px-6 py-4">Employee</th>
              <th className="px-6 py-4">Position</th>
              <th className="px-6 py-4">Wage</th>
              <th className="px-6 py-4">Start</th>
              <th className="px-6 py-4">End</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ebef]">
            {loading && <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-[#9c8e99]">Loading contracts...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-[#9c8e99]">No contracts found.</td></tr>}
            {!loading && filtered.map((contract) => <tr key={contract.id}>
              <td className="px-6 py-4"><strong className="block text-sm text-[#352f37]">{contract.employeeName}</strong><small className="text-xs text-[#9c8e99]">{contract.id}</small></td>
              <td className="px-6 py-4 text-sm text-[#756c75]">{contract.jobPosition ?? "Unassigned"}{contract.department ? ` · ${contract.department}` : ""}</td>
              <td className="px-6 py-4 text-sm text-[#756c75]">{money(contract.wage)}</td>
              <td className="px-6 py-4 text-sm text-[#756c75]">{contract.startDate}</td>
              <td className="px-6 py-4 text-sm text-[#756c75]">{contract.endDate ?? "Open-ended"}</td>
              <td className="px-6 py-4"><Status>{STATUS_LABEL[contract.status]}</Status></td>
              <td className="px-6 py-4 text-right"><Link to={`/contracts/${contract.id}/edit`} className="text-sm font-bold text-[#714b67]">Edit</Link></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}
