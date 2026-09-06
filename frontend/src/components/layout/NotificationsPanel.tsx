import { AlertTriangle, Bell, FileWarning, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getApiOr } from "@/lib/api-client";
import type { AttendanceSummary, Contract } from "@/types";

// A person still checked in (no check-out yet) for longer than this is
// flagged as an anomaly worth an admin's attention — e.g. a forgotten
// check-out or someone genuinely overworking.
const ANOMALY_HOURS_THRESHOLD = 16;

// Contracts ending within this many days are surfaced as "expiring
// soon" so HR can act before the contract actually lapses.
const CONTRACT_EXPIRY_WINDOW_DAYS = 30;

const fallbackSummary: AttendanceSummary = { date: new Date().toISOString().slice(0, 10), present: 0, late: 0, onLeave: 0, absent: 0, rows: [] };

interface AnomalyNotification {
  kind: "anomaly";
  id: string;
  title: string;
  detail: string;
}

interface ContractExpiryNotification {
  kind: "contract";
  id: string;
  title: string;
  detail: string;
  expired: boolean;
}

type Notification = AnomalyNotification | ContractExpiryNotification;

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

function daysUntil(iso: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(iso); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function NotificationsPanel({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<AttendanceSummary>(fallbackSummary);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getApiOr<AttendanceSummary>("/attendance/", fallbackSummary),
      getApiOr<Contract[]>("/contracts/", [])
    ])
      .then(([attendanceResult, contractsResult]) => {
        if (cancelled) return;
        setSummary(attendanceResult);
        setContracts(contractsResult);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    // Poll every 5 minutes so the bell stays current for anyone
    // leaving the tab open through the day.
    const interval = window.setInterval(() => {
      void Promise.all([
        getApiOr<AttendanceSummary>("/attendance/", fallbackSummary),
        getApiOr<Contract[]>("/contracts/", [])
      ]).then(([attendanceResult, contractsResult]) => {
        if (cancelled) return;
        setSummary(attendanceResult);
        setContracts(contractsResult);
      });
    }, 5 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [enabled]);

  const notifications = useMemo<Notification[]>(() => {
    if (!enabled) return [];

    const anomalies: AnomalyNotification[] = summary.rows
      .filter((row) => row.checkInAt && !row.checkOutAt && hoursSince(row.checkInAt) > ANOMALY_HOURS_THRESHOLD)
      .map((row) => {
        const hours = hoursSince(row.checkInAt as string);
        return {
          kind: "anomaly",
          id: `anomaly-${row.employeeId}`,
          title: row.fullName,
          detail: `Active for ${hours.toFixed(1)} hrs without checking out`
        };
      });

    const contractAlerts: ContractExpiryNotification[] = contracts
      .filter((contract) => contract.endDate && (contract.status === "running" || contract.status === "expired"))
      .map((contract) => ({ contract, days: daysUntil(contract.endDate as string) }))
      .filter(({ days, contract }) => contract.status === "expired" || days <= CONTRACT_EXPIRY_WINDOW_DAYS)
      .sort((a, b) => a.days - b.days)
      .map(({ contract, days }) => ({
        kind: "contract",
        id: `contract-${contract.id}`,
        title: contract.employeeName,
        detail:
          days < 0
            ? `Contract expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`
            : days === 0
              ? "Contract expires today"
              : `Contract expires in ${days} day${days === 1 ? "" : "s"}`,
        expired: days < 0
      }));

    return [...anomalies, ...contractAlerts];
  }, [enabled, summary, contracts]);

  if (!enabled) {
    return <button className="relative rounded-lg p-2 text-[#756c75] hover:bg-[#f3edf2]" aria-label="Notifications"><Bell size={19} /></button>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative rounded-lg p-2 text-[#756c75] hover:bg-[#f3edf2]"
        aria-label="Notifications"
      >
        <Bell size={19} />
        {notifications.length > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-[#b64e5b] px-1 text-[10px] font-bold leading-none text-white">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-label="Close notifications" />
          <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-[#e6e0e5] bg-white shadow-[0_10px_30px_rgba(113,75,103,0.14)]">
            <div className="flex items-center justify-between border-b border-[#eee9ed] px-4 py-3">
              <p className="text-sm font-bold text-[#352f37]">Notifications</p>
              <button onClick={() => setOpen(false)} aria-label="Close"><X size={16} className="text-[#9c8e99]" /></button>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {loading && notifications.length === 0 && <p className="px-4 py-6 text-center text-sm text-[#9c8e99]">Loading notifications...</p>}
              {!loading && notifications.length === 0 && <p className="px-4 py-6 text-center text-sm text-[#9c8e99]">You're all caught up.</p>}
              {notifications.map((notification) => (
                <div key={notification.id} className="flex items-start gap-3 border-b border-[#f0ebef] px-4 py-3 last:border-b-0">
                  <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${notification.kind === "anomaly" ? "bg-[#fff0f1] text-[#b64e5b]" : "bg-[#fff7e7] text-[#a36b12]"}`}>
                    {notification.kind === "anomaly" ? <AlertTriangle size={14} /> : <FileWarning size={14} />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#352f37]">{notification.title}</p>
                    <p className="text-xs text-[#756c75]">{notification.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
