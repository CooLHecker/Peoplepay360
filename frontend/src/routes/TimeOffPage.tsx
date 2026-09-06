import { Check, Plus, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Metric, PageHeading, Status, Toolbar } from "@/components/ui/PageBits";
import { apiClient, getApiOr } from "@/lib/api-client";
import { isAdmin, useAuth } from "@/lib/auth";
import { demoEmployees } from "@/features/employees/data";
import { demoTimeOffBalance, demoTimeOffRequests, demoTimeOffSummary, demoTimeOffTypes } from "@/features/timeoff/data";
import type { Employee, TimeOffBalance, TimeOffRequest, TimeOffSummary, TimeOffType } from "@/types";

const STATUS_LABEL: Record<TimeOffRequest["status"], string> = {
  draft: "Draft",
  submitted: "Pending",
  approved: "Approved",
  refused: "Refused"
};

export default function TimeOffPage() {
  const { session } = useAuth();
  const admin = isAdmin(session?.roles ?? []);

  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [types, setTypes] = useState<TimeOffType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<TimeOffSummary | null>(null);
  const [balance, setBalance] = useState<TimeOffBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typesError, setTypesError] = useState("");
  const [employeesError, setEmployeesError] = useState("");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setTypesError("");
    setEmployeesError("");

    const requestsPromise = apiClient
      .get<TimeOffRequest[]>("/time-off/requests/")
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Showing offline sample data — check the API connection.");
        return demoTimeOffRequests;
      });

    apiClient
      .get<TimeOffType[]>("/time-off/types/")
      .catch((err) => {
        if (!cancelled) setTypesError(err instanceof Error ? err.message : "Unable to load time off types.");
        return demoTimeOffTypes;
      })
      .then((result) => { if (!cancelled) setTypes(result); });

    if (admin) {
      void getApiOr<TimeOffSummary>("/time-off/", demoTimeOffSummary).then((result) => { if (!cancelled) setSummary(result); });
      apiClient
        .get<Employee[]>("/employees/")
        .catch((err) => {
          if (!cancelled) setEmployeesError(err instanceof Error ? err.message : "Unable to load employees.");
          return demoEmployees;
        })
        .then((result) => { if (!cancelled) setEmployees(result); });
    } else {
      void getApiOr<TimeOffBalance[]>("/time-off/balance", demoTimeOffBalance).then((result) => { if (!cancelled) setBalance(result); });
    }

    requestsPromise
      .then((result) => { if (!cancelled) setRequests(result); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [admin]);

  const filtered = useMemo(
    () => requests.filter((request) => `${request.employeeName} ${request.timeOffTypeName}`.toLowerCase().includes(query.toLowerCase())),
    [requests, query]
  );

  const decide = async (id: string, action: "approve" | "refuse") => {
    setBusyId(id);
    setError("");
    try {
      const updated = await apiClient.post<TimeOffRequest>(`/time-off/requests/${id}/${action}`);
      setRequests((current) => current.map((request) => (request.id === id ? updated : request)));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to ${action} this request. Check the API connection.`);
    } finally {
      setBusyId(null);
    }
  };

  return <div className="mx-auto max-w-[1440px]">
    <PageHeading
      eyebrow="Requests & approvals"
      title="Time off"
      description="Review leave requests and keep availability visible across the team."
      action={!admin ? <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#714b67] px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />Request time off</button> : undefined}
    />

    <div className="mb-5 grid gap-4 sm:grid-cols-3">
      {admin
        ? <>
            <Metric label="Pending review" value={String(summary?.pending ?? 0)} detail="Awaiting decision" tone="amber" />
            <Metric label="Approved this month" value={String(summary?.approved_this_month ?? 0)} detail="This month" tone="green" />
            <Metric label="Days out this week" value={String(summary?.days_out_this_week ?? 0)} detail="Team-wide" tone="plum" />
          </>
        : (balance.length > 0
            ? balance.slice(0, 3).map((line) => <Metric key={line.timeOffTypeId} label={line.timeOffTypeName} value={`${line.remaining} days`} detail="Available" tone="plum" />)
            : <div className="rounded-xl border border-[#e6e0e5] bg-white p-4 sm:col-span-3"><p className="text-sm text-[#9c8e99]">No leave balances allocated yet.</p></div>)}
    </div>

    {error && <p className="mb-4 rounded-lg bg-[#fff7e7] p-3 text-sm font-semibold text-[#a36b12]">{error}</p>}
    <Toolbar onSearch={setQuery} placeholder="Search requests" />

    <div className="overflow-hidden rounded-xl border border-[#e6e0e5] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left">
          <thead className="border-b border-[#eee9ed] bg-[#fbf8fa] text-xs uppercase tracking-wider text-[#9c8e99]">
            <tr>
              <th className="px-6 py-4">Employee</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Dates</th>
              <th className="px-6 py-4">Days</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ebef]">
            {loading && <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-[#9c8e99]">Loading time off requests...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-[#9c8e99]">No time off requests found.</td></tr>}
            {!loading && filtered.map((request) => <tr key={request.id}>
              <td className="px-6 py-4"><p className="text-sm font-bold text-[#352f37]">{request.employeeName}</p><p className="text-xs text-[#9c8e99]">{request.id}</p></td>
              <td className="px-6 py-4 text-sm text-[#756c75]">{request.timeOffTypeName}</td>
              <td className="px-6 py-4 text-sm text-[#756c75]">{request.startDate === request.endDate ? request.startDate : `${request.startDate} - ${request.endDate}`}</td>
              <td className="px-6 py-4 text-sm text-[#756c75]">{request.numberOfDays}</td>
              <td className="px-6 py-4"><Status>{STATUS_LABEL[request.status]}</Status></td>
              <td className="px-6 py-4 text-right">
                {admin && request.status === "submitted" && <span className="inline-flex gap-1">
                  <button onClick={() => decide(request.id, "approve")} disabled={busyId === request.id} className="rounded-md p-2 text-[#27804d] hover:bg-[#eef8f2] disabled:opacity-40" aria-label="Approve request"><Check size={17} /></button>
                  <button onClick={() => decide(request.id, "refuse")} disabled={busyId === request.id} className="rounded-md p-2 text-[#b64e5b] hover:bg-[#fff0f1] disabled:opacity-40" aria-label="Refuse request"><X size={17} /></button>
                </span>}
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>

    {modalOpen && <RequestTimeOffModal
      types={types}
      typesError={typesError}
      employees={employees}
      employeesError={employeesError}
      admin={admin}
      onClose={() => setModalOpen(false)}
      onCreated={(created) => setRequests((current) => [created, ...current])}
    />}
  </div>;
}

function RequestTimeOffModal({ types, typesError, employees, employeesError, admin, onClose, onCreated }: {
  types: TimeOffType[];
  typesError: string;
  employees: Employee[];
  employeesError: string;
  admin: boolean;
  onClose: () => void;
  onCreated: (request: TimeOffRequest) => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [timeOffTypeId, setTimeOffTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // typesError/employeesError are only set when the real API call failed
  // and we fell back to offline sample data (see TimeOffPage's fetch
  // effect). That sample data doesn't correspond to real database rows,
  // so a request built from it can never actually be saved — catching
  // that here, before the user fills out the whole form, is clearer
  // than letting them submit and hit a confusing failure afterwards.
  const offline = Boolean(typesError) || (admin && Boolean(employeesError));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (offline) { setError(typesError || employeesError || "Showing offline sample data — check the API connection and reopen this form."); return; }
    if (!timeOffTypeId) { setError("Please select a time off type."); return; }
    const timeOffTypeIdNumber = Number(timeOffTypeId);
    if (!Number.isFinite(timeOffTypeIdNumber)) { setError("This time off type list looks out of date — check the API connection and reopen this form."); return; }
    let employeeIdNumber: number | undefined;
    if (admin) {
      if (!employeeId) { setError("Please select an employee."); return; }
      employeeIdNumber = Number(employeeId);
      if (!Number.isFinite(employeeIdNumber)) { setError("This employee list looks out of date — check the API connection and reopen this form."); return; }
    }
    if (!startDate || !endDate) { setError("Start and end dates are required."); return; }
    if (endDate < startDate) { setError("End date cannot be before the start date."); return; }
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        time_off_type_id: timeOffTypeIdNumber,
        start_date: startDate,
        end_date: endDate,
        reason: reason || null,
        save_as_draft: saveAsDraft
      };
      if (admin) payload.employee_id = employeeIdNumber;
      const created = await apiClient.post<TimeOffRequest>("/time-off/requests/", payload);
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit this request. Check the API connection.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-40 grid place-items-center bg-[#25212a]/30 p-4">
    <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#352f37]">Request time off</h2>
          <p className="mt-1 text-sm text-[#9c8e99]">Submit a leave request for approval.</p>
        </div>
        <button onClick={onClose} aria-label="Close"><X size={18} /></button>
      </div>
      {offline && <p className="mt-4 rounded-lg bg-[#fff7e7] p-3 text-sm font-semibold text-[#a36b12]">
        {typesError && employeesError
          ? `Time off types and employees failed to load (${typesError}; ${employeesError}), so the lists below are offline sample data and can't be submitted. Fix the API connection and reopen this form.`
          : typesError
            ? `Time off types failed to load (${typesError}), so the list below is offline sample data and can't be submitted. Fix the API connection and reopen this form.`
            : `Employees failed to load (${employeesError}), so the list below is offline sample data and can't be submitted. Fix the API connection and reopen this form.`}
      </p>}
      <form onSubmit={submit} className="mt-5 space-y-4">
        {admin && <label className="block text-sm font-bold text-[#352f37]">Employee *
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] bg-white px-3 text-sm font-normal outline-none focus:border-[#714b67]">
            <option value="">Select an employee</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
          </select>
        </label>}
        <label className="block text-sm font-bold text-[#352f37]">Time off type *
          <select value={timeOffTypeId} onChange={(event) => setTimeOffTypeId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] bg-white px-3 text-sm font-normal outline-none focus:border-[#714b67]">
            <option value="">Select a type</option>
            {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-[#352f37]">Start date *<input value={startDate} onChange={(event) => setStartDate(event.target.value)} type="date" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label>
          <label className="text-sm font-bold text-[#352f37]">End date *<input value={endDate} onChange={(event) => setEndDate(event.target.value)} type="date" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label>
        </div>
        <label className="block text-sm font-bold text-[#352f37]">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Optional note for your manager" className="mt-2 w-full rounded-lg border border-[#e6e0e5] px-3 py-2 text-sm font-normal outline-none focus:border-[#714b67]" /></label>
        <label className="flex items-center gap-2 text-sm font-bold text-[#352f37]"><input type="checkbox" checked={saveAsDraft} onChange={(event) => setSaveAsDraft(event.target.checked)} className="h-4 w-4 accent-[#714b67]" /> Save as draft instead of submitting</label>
        {error && <p className="rounded-lg bg-[#fff0f1] p-3 text-sm font-semibold text-[#b64e5b]">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-bold text-[#756c75]">Cancel</button>
          <button disabled={saving || offline} title={offline ? "Reconnect to the API and reopen this form to submit." : undefined} className="rounded-lg bg-[#714b67] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? "Submitting..." : "Submit request"}</button>
        </div>
      </form>
    </section>
  </div>;
}
