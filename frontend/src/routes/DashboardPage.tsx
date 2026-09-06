import { ArrowUpRight, CalendarCheck2, Clock3, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Metric, Status, money } from "@/components/ui/PageBits";
import { useAuth } from "@/lib/auth";
import { getApiOr } from "@/lib/api-client";
import type { DashboardSummary } from "@/types";

// Shown only until the real /dashboard/ call resolves (or if it
// fails, e.g. the signed-in account lacks an admin/HR role) — never
// left on screen otherwise, so this page always reflects real
// employees, attendance, time off, contracts, and payroll.
const fallbackSummary: DashboardSummary = {
  totalEmployees: 0,
  presentToday: 0,
  lateToday: 0,
  onLeaveToday: 0,
  absentToday: 0,
  pendingTimeOff: 0,
  attendanceRateThisMonth: null,
  workforce: { active: 0, inactive: 0, terminated: 0, onLeaveToday: 0 },
  payroll: { periodLabel: "", periodYear: 0, periodMonth: 0, totalGross: 0, status: "pending" },
  missingDetailsCount: 0,
  activeWorkingSchedules: 0,
  recentActivity: []
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

// Small deterministic palette so each activity avatar isn't the same
// color, without needing a real per-person color anywhere in the data.
const AVATAR_TONES = [
  { bg: "bg-[#eef8f2]", text: "text-[#27804d]" },
  { bg: "bg-[#f3edf2]", text: "text-[#714b67]" },
  { bg: "bg-[#eef5fb]", text: "text-[#3d6f99]" },
  { bg: "bg-[#fdf3e7]", text: "text-[#a36b12]" }
];

export default function DashboardPage() {
  const { session } = useAuth();
  const name = session?.user.full_name ?? "there";
  const [summary, setSummary] = useState<DashboardSummary>(fallbackSummary);
  // Real, aggregated numbers pulled fresh on every visit — see
  // backend/app/api/v1/endpoints/dashboard.py for what backs each field.
  useEffect(() => { void getApiOr<DashboardSummary>("/dashboard/", fallbackSummary).then(setSummary); }, []);

  const today = new Date();
  const dateLabel = today.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const monthLabel = today.toLocaleDateString([], { month: "long", year: "numeric" });

  const tasks = [
    { title: "Review time-off requests", count: summary.pendingTimeOff === 0 ? "Nothing pending" : `${summary.pendingTimeOff} pending`, to: "/time-off" },
    {
      title: `Run ${summary.payroll.periodLabel || monthLabel} payroll`,
      count: summary.payroll.status === "completed" ? `Completed · ${money(summary.payroll.totalGross)}` : `Due · projected ${money(summary.payroll.totalGross)}`,
      to: "/payroll"
    },
    { title: "Complete employee records", count: summary.missingDetailsCount === 0 ? "All up to date" : `${summary.missingDetailsCount} missing work email`, to: "/employees" },
    { title: "Manage working schedules", count: `${summary.activeWorkingSchedules} schedule${summary.activeWorkingSchedules === 1 ? "" : "s"} defined`, to: "/working-schedules" }
  ];

  return (
    <div className="mx-auto max-w-[1440px]">
      <div className="mb-8 flex items-end justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#9c8e99]">{dateLabel}</p><h1 className="text-4xl font-bold tracking-tight text-[#5c3a54]">Good morning, {name.split(" ")[0]}</h1><p className="mt-2 text-sm text-[#756c75]">Here is what is happening across your people operations today.</p></div><span className="hidden rounded-full border border-[#e6e0e5] bg-white px-3 py-2 text-xs font-bold text-[#756c75] sm:block">{monthLabel}</span></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total employees" value={String(summary.totalEmployees)} detail={`${summary.workforce.active} active`} tone="plum" /><Metric label="Present today" value={String(summary.presentToday + summary.lateToday)} detail={summary.workforce.active === 0 ? "--" : `${(((summary.presentToday + summary.lateToday) / summary.workforce.active) * 100).toFixed(1)}%`} tone="green" /><Metric label="Pending leave" value={String(summary.pendingTimeOff)} detail={summary.pendingTimeOff === 0 ? "All clear" : "Needs review"} tone="amber" /><Metric label={summary.payroll.status === "completed" ? "This month's payroll" : "Projected payroll"} value={money(summary.payroll.totalGross)} detail={summary.payroll.status === "completed" ? "Completed" : "Not run yet"} tone="blue" /></div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]"><section className="rounded-xl border border-[#e6e0e5] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"><div className="mb-6 flex items-center justify-between"><div><h2 className="text-lg font-bold text-[#352f37]">Workforce snapshot</h2><p className="mt-1 text-sm text-[#9c8e99]">A quick look at your current workforce</p></div><Link to="/employees" className="text-sm font-bold text-[#714b67]">View team <ArrowUpRight className="ml-1 inline" size={15} /></Link></div><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-lg bg-[#fbf8fa] p-4"><Users size={20} className="text-[#714b67]" /><p className="mt-5 text-2xl font-bold text-[#352f37]">{summary.workforce.active}</p><p className="text-xs text-[#9c8e99]">Active</p></div><div className="rounded-lg bg-[#fbf8fa] p-4"><Clock3 size={20} className="text-[#3d6f99]" /><p className="mt-5 text-2xl font-bold text-[#352f37]">{summary.workforce.inactive + summary.workforce.terminated}</p><p className="text-xs text-[#9c8e99]">Inactive / terminated</p></div><div className="rounded-lg bg-[#fbf8fa] p-4"><CalendarCheck2 size={20} className="text-[#27804d]" /><p className="mt-5 text-2xl font-bold text-[#352f37]">{summary.onLeaveToday}</p><p className="text-xs text-[#9c8e99]">On leave today</p></div></div><div className="mt-7"><div className="mb-2 flex justify-between text-xs font-bold text-[#756c75]"><span>Attendance this month</span><span>{summary.attendanceRateThisMonth === null ? "--" : `${summary.attendanceRateThisMonth}%`}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#f0ebef]"><div className="h-full rounded-full bg-[#714b67]" style={{ width: `${summary.attendanceRateThisMonth ?? 0}%` }} /></div></div></section><section className="rounded-xl border border-[#e6e0e5] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"><h2 className="text-lg font-bold text-[#352f37]">Workspace tasks</h2><p className="mt-1 text-sm text-[#9c8e99]">Items that need your attention</p><div className="mt-5 space-y-2">{tasks.map((task) => <Link key={task.title} to={task.to} className="flex items-center justify-between rounded-lg border border-transparent bg-[#fbf8fa] p-4 transition hover:border-[#e6e0e5] hover:bg-white"><div><p className="text-sm font-bold text-[#352f37]">{task.title}</p><p className="mt-1 text-xs text-[#9c8e99]">{task.count}</p></div><ArrowUpRight size={17} className="text-[#714b67]" /></Link>)}</div></section></div>
      <section className="mt-6 rounded-xl border border-[#e6e0e5] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold text-[#352f37]">Recent activity</h2><p className="mt-1 text-sm text-[#9c8e99]">The latest changes across your workspace</p></div>{summary.recentActivity.length > 0 && <Status>Live</Status>}</div>{summary.recentActivity.length === 0 ? <p className="text-sm text-[#9c8e99]">Nothing has happened yet — activity will show up here as time off is decided, contracts are created, or payroll runs.</p> : <div className="grid gap-4 md:grid-cols-3">{summary.recentActivity.map((item, index) => { const tone = AVATAR_TONES[index % AVATAR_TONES.length]; return <div key={item.id} className="flex gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tone.bg} text-xs font-bold ${tone.text}`}>{item.initials}</span><p className="text-sm text-[#756c75]"><strong className="text-[#352f37]">{item.actorName}</strong>{item.detail}<span className="block pt-1 text-xs text-[#b2a6ae]">{timeAgo(item.occurredAt)}</span></p></div>; })}</div>}</section>
    </div>
  );
}
