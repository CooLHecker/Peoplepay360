import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeading, Status, Toolbar } from "@/components/ui/PageBits";
import { apiClient } from "@/lib/api-client";
import { demoSchedules } from "@/features/schedules/data";
import type { WorkingSchedule } from "@/types";

function formatPattern(schedule: WorkingSchedule): string {
  const hours = `${schedule.hoursPerWeek} hrs/week`;
  const days = `${schedule.daysPerWeek} days/week`;
  const hoursWindow = schedule.isFlexible
    ? "Flexible hours"
    : schedule.startTime && schedule.endTime
      ? `${schedule.startTime.slice(0, 5)}\u2013${schedule.endTime.slice(0, 5)}`
      : null;
  return [hours, days, hoursWindow, schedule.timezone].filter(Boolean).join(" \u00b7 ");
}

export default function SchedulesPage() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<WorkingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const path = includeInactive ? "/schedules/?include_inactive=true" : "/schedules/";
    apiClient
      .get<WorkingSchedule[]>(path)
      .then((result) => { if (!cancelled) setSchedules(result); })
      .catch((err) => {
        if (cancelled) return;
        setSchedules(demoSchedules);
        setError(err instanceof Error ? err.message : "Showing offline sample data — check the API connection.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [includeInactive]);

  const filtered = useMemo(
    () => schedules.filter((schedule) => `${schedule.name} ${schedule.description ?? ""} ${schedule.timezone}`.toLowerCase().includes(query.toLowerCase())),
    [schedules, query]
  );

  const remove = async (schedule: WorkingSchedule) => {
    if (!window.confirm(`Delete "${schedule.name}"? This cannot be undone.`)) return;
    try {
      await apiClient.del(`/schedules/${schedule.id}`);
      setSchedules((current) => current.filter((item) => item.id !== schedule.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete this schedule.");
    }
  };

  return <div className="mx-auto max-w-[1200px]">
    <PageHeading
      eyebrow="Employees / schedules"
      title="Working schedules"
      description="Define the working patterns used by your teams."
      action={<button onClick={() => navigate("/working-schedules/new")} className="inline-flex items-center gap-2 rounded-lg bg-[#714b67] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} /> New</button>}
    />
    {error && <p className="mb-4 rounded-lg bg-[#fff7e7] p-3 text-sm font-semibold text-[#a36b12]">{error}</p>}
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1"><Toolbar onSearch={setQuery} placeholder="Search working schedules" /></div>
      <label className="flex items-center gap-2 text-sm font-semibold text-[#756c75]">
        <input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} className="h-4 w-4 accent-[#714b67]" />
        Show retired schedules
      </label>
    </div>
    <div className="overflow-hidden rounded-xl border border-[#e6e0e5] bg-white">
      <div className="divide-y divide-[#f0ebef]">
        {loading && <div className="px-6 py-8 text-center text-sm text-[#9c8e99]">Loading schedules...</div>}
        {!loading && filtered.length === 0 && <div className="px-6 py-8 text-center text-sm text-[#9c8e99]">No working schedules found.</div>}
        {!loading && filtered.map((schedule) => <div key={schedule.id} className="flex items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#352f37]">{schedule.name}</p>
            <p className="mt-1 text-xs text-[#9c8e99]">{formatPattern(schedule)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <Status>{schedule.isActive ? "Active" : "Retired"}</Status>
            <Link to={`/working-schedules/${schedule.id}/edit`} className="text-sm font-bold text-[#714b67]">Edit</Link>
            <button onClick={() => remove(schedule)} className="text-sm font-bold text-[#b64e5b]">Delete</button>
          </div>
        </div>)}
      </div>
    </div>
  </div>;
}
