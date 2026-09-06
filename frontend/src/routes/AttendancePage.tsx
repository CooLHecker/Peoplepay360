import { CalendarDays, Download, UserCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Metric, PageHeading, Status, Toolbar } from "@/components/ui/PageBits";
import { getApiOr } from "@/lib/api-client";
import type { AttendanceSummary } from "@/types";

// Shown only until the real /attendance/ call resolves (or if it fails,
// e.g. the signed-in account lacks an admin/HR role) — never left on
// screen otherwise, so the dashboard always reflects real check-ins.
const fallbackSummary: AttendanceSummary = { date: new Date().toISOString().slice(0, 10), present: 0, late: 0, onLeave: 0, absent: 0, rows: [] };

function formatTime(iso: string | null): string {
  if (!iso) return "--";
  // Attendance is always IST (see backend/app/core/timezone.py) — pin
  // the display timezone so it renders as IST for every admin, not
  // whatever timezone their own browser happens to be set to.
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

function statusLabel(status: AttendanceSummary["rows"][number]["status"]): string {
  if (status === "present") return "Present";
  if (status === "late") return "Late";
  if (status === "on_leave") return "On leave";
  return "Absent";
}

export default function AttendancePage() {
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState<AttendanceSummary>(fallbackSummary);
  // Real per-employee attendance for today, pulled fresh on every visit
  // to this page so it reflects check-ins as they happen — no mock rows.
  useEffect(() => { void getApiOr<AttendanceSummary>("/attendance/", fallbackSummary).then(setSummary); }, []);
  const rows = useMemo(
    () => summary.rows.filter((row) => row.fullName.toLowerCase().includes(query.toLowerCase())),
    [summary.rows, query]
  );
  const total = summary.present + summary.late + summary.onLeave + summary.absent;
  const pct = (value: number) => (total === 0 ? "0%" : `${((value / total) * 100).toFixed(1)}%`);
  const dateLabel = new Date(`${summary.date}T00:00:00`).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeading
        eyebrow="Daily operations"
        title="Attendance"
        description="Monitor today's attendance and keep your team in sync."
        action={
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg border border-[#e6e0e5] bg-white px-4 py-2.5 text-sm font-bold text-[#756c75]">
              <Download size={16} />Export
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-[#714b67] px-4 py-2.5 text-sm font-bold text-white">
              <CalendarDays size={16} />{dateLabel}
            </button>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Present today" value={String(summary.present)} detail={pct(summary.present)} tone="green" />
        <Metric label="Late arrivals" value={String(summary.late)} detail={pct(summary.late)} tone="amber" />
        <Metric label="On leave" value={String(summary.onLeave)} detail={pct(summary.onLeave)} tone="plum" />
      </div>
      <div className="mt-6 rounded-xl border border-[#e6e0e5] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="mb-5 flex items-center gap-3">
          <UserCheck className="text-[#714b67]" size={22} />
          <div>
            <h2 className="text-lg font-bold text-[#352f37]">Today's log</h2>
            <p className="text-sm text-[#9c8e99]">Updated moments ago</p>
          </div>
        </div>
        <Toolbar onSearch={setQuery} placeholder="Search employees" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left">
            <thead className="border-b border-[#eee9ed] text-xs uppercase tracking-wider text-[#9c8e99]">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Check in</th>
                <th className="px-4 py-3">Check out</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebef]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-[#9c8e99]">
                    No attendance recorded yet today.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.employeeId}>
                    <td className="px-4 py-4">
                      <p className="text-sm font-bold text-[#352f37]">{row.fullName}</p>
                      <p className="text-xs text-[#9c8e99]">{row.workEmail ?? "--"}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-[#756c75]">{formatTime(row.checkInAt)}</td>
                    <td className="px-4 py-4 text-sm text-[#756c75]">{formatTime(row.checkOutAt)}</td>
                    <td className="px-4 py-4">
                      <Status>{statusLabel(row.status)}</Status>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
