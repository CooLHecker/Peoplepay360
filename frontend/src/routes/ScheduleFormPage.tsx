import { ArrowLeft, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeading } from "@/components/ui/PageBits";
import { apiClient } from "@/lib/api-client";
import { findDemoSchedule } from "@/features/schedules/data";
import type { WorkingSchedule } from "@/types";

const COMMON_TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "America/Los_Angeles", "UTC"];

export default function ScheduleFormPage() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(scheduleId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isFlexible, setIsFlexible] = useState(false);
  const [hoursPerWeek, setHoursPerWeek] = useState("40");
  const [daysPerWeek, setDaysPerWeek] = useState("5");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [isActive, setIsActive] = useState(true);

  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!scheduleId) return;
    let cancelled = false;
    apiClient
      .get<WorkingSchedule>(`/schedules/${scheduleId}`)
      .then((existing) => { if (!cancelled) applyExisting(existing); })
      .catch(() => {
        if (cancelled) return;
        const demo = findDemoSchedule(scheduleId);
        if (demo) applyExisting(demo);
      })
      .finally(() => { if (!cancelled) setLoadingExisting(false); });

    function applyExisting(existing: WorkingSchedule) {
      setName(existing.name);
      setDescription(existing.description ?? "");
      setIsFlexible(existing.isFlexible);
      setHoursPerWeek(String(existing.hoursPerWeek));
      setDaysPerWeek(String(existing.daysPerWeek));
      if (existing.startTime) setStartTime(existing.startTime.slice(0, 5));
      if (existing.endTime) setEndTime(existing.endTime.slice(0, 5));
      setTimezone(existing.timezone);
      setIsActive(existing.isActive);
    }
    return () => { cancelled = true; };
  }, [scheduleId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError("Please enter a name."); return; }
    const hours = Number(hoursPerWeek);
    if (!hours || hours <= 0 || hours > 168) { setError("Please enter a valid weekly hours value."); return; }
    const days = Number(daysPerWeek);
    if (!days || days < 1 || days > 7) { setError("Days per week must be between 1 and 7."); return; }
    if (!isFlexible && (!startTime || !endTime)) { setError("Start and end time are required unless the schedule is flexible."); return; }
    if (!isFlexible && startTime >= endTime) { setError("End time must be after start time."); return; }

    setSaving(true); setError("");
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        is_flexible: isFlexible,
        hours_per_week: hours,
        days_per_week: days,
        start_time: isFlexible ? null : `${startTime}:00`,
        end_time: isFlexible ? null : `${endTime}:00`,
        timezone,
        is_active: isActive
      };
      if (isEditing) await apiClient.put(`/schedules/${scheduleId}`, payload);
      else await apiClient.post("/schedules/", payload);
      navigate("/working-schedules");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this schedule. Check the API connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingExisting) return <div className="mx-auto max-w-[700px] rounded-xl border border-[#e6e0e5] bg-white p-8 text-sm text-[#9c8e99]">Loading schedule...</div>;

  return <div className="mx-auto max-w-[700px]">
    <Link to="/working-schedules" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#714b67]"><ArrowLeft size={16} /> Cancel</Link>
    <PageHeading eyebrow="Employees / schedules" title={isEditing ? "Edit working schedule" : "New working schedule"} description="Define the pattern of hours and days this schedule represents." />
    <form onSubmit={submit} className="rounded-xl border border-[#e6e0e5] bg-white p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm font-bold text-[#352f37]">Name *
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Standard 40 hours" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" />
        </label>
        <label className="sm:col-span-2 text-sm font-bold text-[#352f37]">Description
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" />
        </label>
        <label className="text-sm font-bold text-[#352f37]">Hours per week *
          <input value={hoursPerWeek} onChange={(event) => setHoursPerWeek(event.target.value)} type="number" min="1" max="168" step="0.5" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" />
        </label>
        <label className="text-sm font-bold text-[#352f37]">Days per week *
          <input value={daysPerWeek} onChange={(event) => setDaysPerWeek(event.target.value)} type="number" min="1" max="7" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" />
        </label>
        <label className="text-sm font-bold text-[#352f37]">Timezone *
          <select value={timezone} onChange={(event) => setTimezone(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] bg-white px-3 text-sm font-normal outline-none focus:border-[#714b67]">
            {COMMON_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-[#352f37]">
          <input type="checkbox" checked={isFlexible} onChange={(event) => setIsFlexible(event.target.checked)} className="h-4 w-4 accent-[#714b67]" /> Flexible hours (no fixed start/end time)
        </label>

        {!isFlexible && <>
          <label className="text-sm font-bold text-[#352f37]">Start time *
            <input value={startTime} onChange={(event) => setStartTime(event.target.value)} type="time" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" />
          </label>
          <label className="text-sm font-bold text-[#352f37]">End time *
            <input value={endTime} onChange={(event) => setEndTime(event.target.value)} type="time" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" />
          </label>
        </>}
      </div>

      {isEditing && <label className="mt-6 flex items-center gap-2 text-sm font-bold text-[#352f37]"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4 accent-[#714b67]" /> Active (uncheck to retire this schedule)</label>}

      {error && <p className="mt-5 rounded-lg bg-[#fff0f1] p-3 text-sm font-semibold text-[#b64e5b]">{error}</p>}
      <div className="mt-7 flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#714b67] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><Save size={16} />{saving ? "Saving schedule..." : "Save schedule"}</button></div>
    </form>
  </div>;
}
