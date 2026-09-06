import { ArrowLeft, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageHeading } from "@/components/ui/PageBits";
import { apiClient, getApiOr } from "@/lib/api-client";
import { demoEmployees } from "@/features/employees/data";
import { findDemoContract } from "@/features/contracts/data";
import type { Contract, Employee } from "@/types";

export default function ContractFormPage() {
  const { contractId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = Boolean(contractId);
  const presetEmployeeId = searchParams.get("employee") ?? "";

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState(presetEmployeeId);
  const [department, setDepartment] = useState("");
  const [jobPosition, setJobPosition] = useState("");
  const [salaryStructureId, setSalaryStructureId] = useState("");
  const [wage, setWage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [openEnded, setOpenEnded] = useState(true);
  const [endDate, setEndDate] = useState("");
  const [cancelled, setCancelled] = useState(false);

  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { void getApiOr<Employee[]>("/employees/", demoEmployees).then(setEmployees); }, []);

  useEffect(() => {
    if (!contractId) return;
    let cancelledEffect = false;
    apiClient
      .get<Contract>(`/contracts/${contractId}`)
      .then((existing) => {
        if (cancelledEffect) return;
        setEmployeeId(existing.employeeId);
        setDepartment(existing.department ?? "");
        setJobPosition(existing.jobPosition ?? "");
        setSalaryStructureId(existing.salaryStructureId ?? "");
        setWage(String(existing.wage));
        setStartDate(existing.startDate);
        setOpenEnded(!existing.endDate);
        setEndDate(existing.endDate ?? "");
        setCancelled(existing.status === "cancelled");
      })
      .catch(() => {
        if (cancelledEffect) return;
        const demo = findDemoContract(contractId);
        if (demo) {
          setEmployeeId(demo.employeeId);
          setDepartment(demo.department ?? "");
          setJobPosition(demo.jobPosition ?? "");
          setSalaryStructureId(demo.salaryStructureId ?? "");
          setWage(String(demo.wage));
          setStartDate(demo.startDate);
          setOpenEnded(!demo.endDate);
          setEndDate(demo.endDate ?? "");
        }
      })
      .finally(() => { if (!cancelledEffect) setLoadingExisting(false); });
    return () => { cancelledEffect = true; };
  }, [contractId]);

  const backHref = employeeId ? `/contracts?employee=${employeeId}` : "/contracts";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!employeeId) { setError("Please select an employee."); return; }
    const wageValue = Number(wage);
    if (!wageValue || wageValue <= 0) { setError("Please enter a valid wage."); return; }
    if (!startDate) { setError("Start date is required."); return; }
    if (!openEnded && endDate && endDate < startDate) { setError("End date cannot be before the start date."); return; }
    setSaving(true); setError("");
    try {
      const payload: Record<string, unknown> = {
        employee_id: Number(employeeId),
        department: department || null,
        job_position: jobPosition || null,
        salary_structure_id: salaryStructureId || null,
        wage: wageValue,
        start_date: startDate,
        end_date: openEnded ? null : endDate || null
      };
      if (isEditing) payload.cancelled = cancelled;
      if (isEditing) await apiClient.put(`/contracts/${contractId}`, payload);
      else await apiClient.post("/contracts/", payload);
      navigate(backHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save contract. Check the API connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingExisting) return <div className="mx-auto max-w-[900px] rounded-xl border border-[#e6e0e5] bg-white p-8 text-sm text-[#9c8e99]">Loading contract...</div>;

  return <div className="mx-auto max-w-[900px]">
    <Link to={backHref} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#714b67]"><ArrowLeft size={16} /> Cancel</Link>
    <PageHeading eyebrow="Employees / contracts" title={isEditing ? "Edit contract" : "New contract"} description="Capture the wage, dates, and role that apply for this agreement." />
    <form onSubmit={submit} className="rounded-xl border border-[#e6e0e5] bg-white p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold text-[#352f37]">Employee *
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} disabled={Boolean(presetEmployeeId) && !isEditing} className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] bg-white px-3 text-sm font-normal outline-none focus:border-[#714b67] disabled:bg-[#fbf8fa]">
            <option value="">Select an employee</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-[#352f37]">Wage (monthly) *<input value={wage} onChange={(event) => setWage(event.target.value)} type="number" min="1" step="0.01" placeholder="65000" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label>
        <label className="text-sm font-bold text-[#352f37]">Department<input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Department" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label>
        <label className="text-sm font-bold text-[#352f37]">Job position<input value={jobPosition} onChange={(event) => setJobPosition(event.target.value)} placeholder="Job position" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label>
        <label className="text-sm font-bold text-[#352f37]">Salary structure<input value={salaryStructureId} onChange={(event) => setSalaryStructureId(event.target.value)} placeholder="e.g. SS-IN-MONTHLY" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label>
        <label className="text-sm font-bold text-[#352f37]">Start date *<input value={startDate} onChange={(event) => setStartDate(event.target.value)} type="date" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label>
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-[#352f37]"><input type="checkbox" checked={openEnded} onChange={(event) => setOpenEnded(event.target.checked)} className="h-4 w-4 accent-[#714b67]" /> Open-ended contract</label>
          {!openEnded && <input value={endDate} onChange={(event) => setEndDate(event.target.value)} type="date" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" />}
        </div>
      </div>

      {isEditing && <label className="mt-6 flex items-center gap-2 text-sm font-bold text-[#b64e5b]"><input type="checkbox" checked={cancelled} onChange={(event) => setCancelled(event.target.checked)} className="h-4 w-4 accent-[#b64e5b]" /> Cancel this contract</label>}

      {error && <p className="mt-5 rounded-lg bg-[#fff0f1] p-3 text-sm font-semibold text-[#b64e5b]">{error}</p>}
      <div className="mt-7 flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#714b67] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><Save size={16} />{saving ? "Saving contract..." : "Save contract"}</button></div>
    </form>
  </div>;
}
