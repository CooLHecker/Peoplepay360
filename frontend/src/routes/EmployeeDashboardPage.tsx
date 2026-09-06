import { Bot, CalendarCheck2, CheckCircle2, Clock3, FileText, LogOut, MapPin, MessageCircle, Send, WalletCards, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Metric, PageHeading, Status, money } from "@/components/ui/PageBits";
import { useAuth } from "@/lib/auth";
import { apiClient, downloadFile } from "@/lib/api-client";
import type { Contract, Payslip, TimeOffRequest } from "@/types";
import interloopLogo from "@/assets/interloop-logo.png";

interface AttendanceResponse {
  id: string;
  status: "open" | "completed";
  checkInAt: string;
  checkInDistanceM: number;
  checkOutAt: string | null;
  checkOutDistanceM: number | null;
  calendarSynced: boolean;
}

// Wraps the browser's Geolocation API in a Promise so callers can
// await a single reading instead of juggling the callback form.
// Coordinates are read fresh at the moment of check-in/out (never
// cached) since the backend re-validates the geofence on both.
function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (error) => {
      reject(new Error(error.code === error.PERMISSION_DENIED ? "Location permission was denied." : "Could not determine your location."));
    }, { enableHighAccuracy: true, timeout: 10000 });
  });
}

function formatTime(iso: string | null): string {
  if (!iso) return "--";
  // Attendance is always IST (see backend/app/core/timezone.py) — pin
  // the display timezone so check-in/out times read correctly no
  // matter what timezone the employee's own device is set to.
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

// Actual worked duration between check-in and check-out — previously
// this just showed the hardcoded word "Completed" instead of a real
// number, regardless of how long the shift actually was.
function formatDuration(checkInIso: string, checkOutIso: string | null): string {
  if (!checkOutIso) return "In progress";
  const totalMinutes = Math.max(0, Math.round((new Date(checkOutIso).getTime() - new Date(checkInIso).getTime()) / 60000));
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

function formatContractDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "2-digit", year: "numeric", timeZone: "Asia/Kolkata" });
}

function contractStatusLabel(status: Contract["status"]): string {
  if (status === "running") return "Running";
  if (status === "expired") return "Expired";
  if (status === "cancelled") return "Cancelled";
  return "Draft";
}

function formatDateParts(iso: string): { date: string; day: string } {
  const parsed = new Date(iso);
  return {
    date: parsed.toLocaleDateString([], { month: "short", day: "2-digit", timeZone: "Asia/Kolkata" }),
    day: parsed.toLocaleDateString([], { weekday: "long", timeZone: "Asia/Kolkata" })
  };
}

// Formats a request's date range for the "My time off requests" card
// below — a single-day request just shows the one date instead of
// "Sep 12 - Sep 12, 2026".
function formatTimeOffDates(startIso: string, endIso: string): string {
  const format = (iso: string) => new Date(iso).toLocaleDateString([], { month: "short", day: "2-digit", year: "numeric", timeZone: "Asia/Kolkata" });
  return startIso === endIso ? format(startIso) : `${format(startIso)} - ${format(endIso)}`;
}

function timeOffStatusLabel(status: TimeOffRequest["status"]): string {
  if (status === "submitted") return "Pending";
  if (status === "refused") return "Refused";
  if (status === "approved") return "Approved";
  return "Draft";
}

export default function EmployeeDashboardPage() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const name = session?.user.full_name ?? "Team member";
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceResponse | null>(null);
  const [history, setHistory] = useState<AttendanceResponse[]>([]);
  const [coordinates, setCoordinates] = useState("Location not captured");
  const [attendanceError, setAttendanceError] = useState("");
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const checkedIn = attendance?.status === "open";
  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([{ from: "bot", text: "Hi! Ask me about your leave, attendance, payroll, or contract." }]);
  const [chatSending, setChatSending] = useState(false);
  const fetchHistory = () => { apiClient.get<AttendanceResponse[]>("/attendance/history").then(setHistory).catch(() => undefined); };
  // The caller's own payslips, most recent first (backend already
  // orders by period desc) — backs the "My payroll" card below.
  // Previously that card showed a hardcoded August 2026 / ₹1,28,400
  // payslip regardless of whether payroll had ever actually run for
  // this employee.
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [payslipError, setPayslipError] = useState("");
  const [downloadingPayslip, setDownloadingPayslip] = useState(false);
  const latestPayslip = payslips[0] ?? null;
  // The caller's own time off requests, most recent first (backend
  // already orders by start_date desc) — backs the "My time off
  // requests" card below. Previously that card always showed the
  // same two hardcoded requests (an Annual leave and a Personal day)
  // regardless of what this employee had actually requested.
  const [timeOff, setTimeOff] = useState<TimeOffRequest[]>([]);
  // The caller's own contracts (backend already orders by start_date
  // desc) — backs the "My contract" card. Previously that card showed
  // a hardcoded "Product Designer" contract from Jan 2024 regardless
  // of whether this employee had a real contract at all. A contract
  // is "current" if it's running, or failing that just the most
  // recent one, so something sensible still shows for a not-yet-
  // started or lapsed contract.
  const [contracts, setContracts] = useState<Contract[]>([]);
  const currentContract = contracts.find((contract) => contract.status === "running") ?? contracts[0] ?? null;
  const downloadLatestPayslip = () => {
    if (!latestPayslip) return;
    setDownloadingPayslip(true);
    setPayslipError("");
    downloadFile(`/payslips/${latestPayslip.id}/pdf`, `payslip-${name.replace(/\s+/g, "_")}-${latestPayslip.periodYear}-${String(latestPayslip.periodMonth).padStart(2, "0")}.pdf`)
      .catch((error) => setPayslipError(error instanceof Error ? error.message : "Could not download payslip."))
      .finally(() => setDownloadingPayslip(false));
  };
  // Restore today's check-in state on page load — otherwise a refresh
  // would forget an open check-in and let someone check in twice —
  // and load the real attendance history that backs the table below
  // (previously hardcoded mock rows that nothing you checked in ever
  // reached).
  useEffect(() => {
    apiClient.get<AttendanceResponse | null>("/attendance/me").then(setAttendance).catch(() => undefined);
    fetchHistory();
    apiClient.get<Payslip[]>("/payslips/").then(setPayslips).catch(() => undefined);
    apiClient.get<TimeOffRequest[]>("/time-off/requests/").then(setTimeOff).catch(() => undefined);
    apiClient.get<Contract[]>("/contracts/").then(setContracts).catch(() => undefined);
  }, []);
  const saveAttendance = async () => {
    setAttendanceError("");
    setAttendanceSaving(true);
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      setCoordinates(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      const path = checkedIn ? "/attendance/check-out" : "/attendance/check-in";
      const result = await apiClient.post<AttendanceResponse>(path, { latitude, longitude });
      setAttendance(result);
      setAttendanceOpen(false);
      fetchHistory();
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : "Could not save attendance.");
    } finally {
      setAttendanceSaving(false);
    }
  };
  // Sends the question to the backend, which grounds Gemini's reply in
  // this employee's own real leave/payroll/attendance/contract data
  // (see backend/app/api/v1/endpoints/chat.py) — previously this just
  // lowercased the question and matched it against four hardcoded
  // keywords, with a fixed canned answer (and a hardcoded payslip
  // figure) regardless of who was asking or what was actually on file.
  const ask = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || chatSending) return;
    const history = messages.slice(-10);
    setMessages((current) => [...current, { from: "user", text: trimmed }]);
    setQuestion("");
    setChatSending(true);
    apiClient
      .post<{ reply: string }>("/chat/ask", { message: trimmed, history })
      .then((result) => setMessages((current) => [...current, { from: "bot", text: result.reply }]))
      .catch((error) => setMessages((current) => [...current, { from: "bot", text: error instanceof Error ? error.message : "Sorry, I couldn't reach the assistant just now. Please try again." }]))
      .finally(() => setChatSending(false));
  };
  return <div className="min-h-screen bg-[#f7f5f6] px-5 py-7 sm:px-8 lg:px-12"><div className="mx-auto max-w-[1250px]"><header className="mb-10 flex items-center justify-between"><Link to="/my-dashboard" className="flex items-center gap-3"><img src={interloopLogo} alt="Interloop" className="h-7 w-auto" /><span className="hidden rounded-full bg-[#f3edf2] px-2.5 py-1 text-xs font-bold text-[#714b67] sm:inline">Employee workspace</span></Link><button onClick={() => { void signOut().then(() => navigate("/employee-login")); }} className="inline-flex items-center gap-2 text-sm font-bold text-[#756c75]"><LogOut size={16} /> Log out</button></header><PageHeading eyebrow="My workspace" title={`Good morning, ${name.split(" ")[0]}`} description="Your attendance, leave, payroll, contract, and time-off information." /><div className="grid gap-4 sm:grid-cols-3"><Metric label="Today's attendance" value={checkedIn ? "Present" : attendance?.status === "completed" ? "Checked out" : "Not checked in"} detail={attendance ? formatTime(attendance.checkInAt) : "Start your day"} tone="green" /><Metric label="Leave balance" value="14 days" detail="Available" tone="plum" /><Metric label="Latest payslip" value={latestPayslip ? money(latestPayslip.netSalary) : "--"} detail={latestPayslip ? (latestPayslip.status === "paid" ? "Paid" : "Generated") : "No payslip yet"} tone="blue" /></div><section className="mt-6 rounded-xl border border-[#e6e0e5] bg-white p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><CalendarCheck2 size={20} className="text-[#714b67]" /><h2 className="text-lg font-bold text-[#352f37]">Today's attendance</h2></div><p className="mt-1 text-sm text-[#9c8e99]">Your location is verified against the office when you check in or out.</p></div><button onClick={() => setAttendanceOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#714b67] px-4 py-2.5 text-sm font-bold text-white"><MapPin size={16} /> {checkedIn ? "Check out" : "Check in"}</button></div><div className="mt-6 grid gap-4 sm:grid-cols-4"><Info icon={<Clock3 size={16} />} label="Check in" value={attendance ? formatTime(attendance.checkInAt) : "--"} /><Info icon={<Clock3 size={16} />} label="Check out" value={attendance ? formatTime(attendance.checkOutAt) : "--"} /><Info icon={<Clock3 size={16} />} label="Worked hours" value={attendance ? formatDuration(attendance.checkInAt, attendance.checkOutAt) : "--"} /><Info icon={<CheckCircle2 size={16} />} label="Status" value={attendance ? attendance.status === "open" ? "On schedule" : "Checked out" : "Not started"} /></div></section><div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]"><section className="rounded-xl border border-[#e6e0e5] bg-white p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-[#352f37]">Attendance this month</h2><p className="mt-1 text-sm text-[#9c8e99]">{new Date().toLocaleDateString([], { month: "long", year: "numeric" })}</p></div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[580px] text-left"><thead className="border-b border-[#eee9ed] text-xs uppercase tracking-wider text-[#9c8e99]"><tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Check in</th><th className="px-3 py-3">Check out</th><th className="px-3 py-3">Hours</th><th className="px-3 py-3">Status</th></tr></thead><tbody className="divide-y divide-[#f0ebef]">{history.length === 0 ? <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-[#9c8e99]">No attendance recorded yet.</td></tr> : history.map((record) => { const { date, day } = formatDateParts(record.checkInAt); return <tr key={record.id}><td className="px-3 py-3"><strong className="block text-sm text-[#352f37]">{date}</strong><small className="text-xs text-[#9c8e99]">{day}</small></td><td className="px-3 py-3 text-sm text-[#756c75]">{formatTime(record.checkInAt)}</td><td className="px-3 py-3 text-sm text-[#756c75]">{formatTime(record.checkOutAt)}</td><td className="px-3 py-3 text-sm text-[#756c75]">{formatDuration(record.checkInAt, record.checkOutAt)}</td><td className="px-3 py-3"><Status>{record.status === "open" ? "In progress" : "Present"}</Status></td></tr>; })}</tbody></table></div></section><section className="rounded-xl border border-[#e6e0e5] bg-white p-6"><h2 className="text-lg font-bold text-[#352f37]">My time off requests</h2><p className="mt-1 text-sm text-[#9c8e99]">Requests and their current status</p><div className="mt-5 space-y-3">{timeOff.length === 0 ? <p className="text-sm text-[#9c8e99]">You haven't requested any time off yet.</p> : timeOff.map((request) => <div key={request.id} className="rounded-lg bg-[#fbf8fa] p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-bold text-[#352f37]">{request.timeOffTypeName}</p><Status>{timeOffStatusLabel(request.status)}</Status></div><p className="mt-2 text-xs text-[#756c75]">{formatTimeOffDates(request.startDate, request.endDate)} · {request.numberOfDays} {request.numberOfDays === 1 ? "day" : "days"}</p></div>)}</div><Link to="/time-off" className="mt-5 inline-block text-sm font-bold text-[#714b67]">Request time off</Link></section></div><div className="mt-6 grid gap-6 md:grid-cols-2"><section className="rounded-xl border border-[#e6e0e5] bg-white p-6"><div className="flex items-center gap-3"><WalletCards size={20} className="text-[#714b67]" /><div><h2 className="text-lg font-bold text-[#352f37]">My payroll</h2><p className="text-sm text-[#9c8e99]">Latest payslip and payment details</p></div></div><div className="mt-6 grid grid-cols-3 gap-3"><Info label="Pay period" value={latestPayslip?.period ?? "--"} /><Info label="Net salary" value={latestPayslip ? money(latestPayslip.netSalary) : "--"} /><Info label="Status" value={latestPayslip ? (latestPayslip.status === "paid" ? "Paid" : "Generated") : "--"} /></div>{payslipError && <p className="mt-4 rounded-lg bg-[#fdecec] p-3 text-xs font-semibold text-[#b3261e]">{payslipError}</p>}{latestPayslip ? <button onClick={downloadLatestPayslip} disabled={downloadingPayslip} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#714b67] disabled:opacity-50"><FileText size={16} /> {downloadingPayslip ? "Preparing..." : "View / download payslip"}</button> : <p className="mt-6 text-sm text-[#9c8e99]">No payslip has been generated for you yet.</p>}<Link to="/payroll/payslips" className="mt-4 inline-block text-xs font-bold text-[#9c8e99] hover:text-[#714b67]">View all payslips</Link></section><section className="rounded-xl border border-[#e6e0e5] bg-white p-6"><div className="flex items-center gap-3"><FileText size={20} className="text-[#714b67]" /><div><h2 className="text-lg font-bold text-[#352f37]">My contract</h2><p className="text-sm text-[#9c8e99]">Your ongoing employment agreement</p></div>{currentContract && <Status>{contractStatusLabel(currentContract.status)}</Status>}</div>{currentContract ? <div className="mt-6 grid grid-cols-2 gap-4"><Info label="Job position" value={currentContract.jobPosition ?? "--"} /><Info label="Start date" value={formatContractDate(currentContract.startDate)} /><Info label="Wage" value={money(currentContract.wage)} /><Info label="Deal status" value={contractStatusLabel(currentContract.status)} /></div> : <p className="mt-6 text-sm text-[#9c8e99]">No contract has been set up for you yet.</p>}</section></div></div>{attendanceOpen && <AttendanceModal coordinates={coordinates} error={attendanceError} saving={attendanceSaving} checkedIn={checkedIn} onClose={() => setAttendanceOpen(false)} onSave={saveAttendance} />}{chatOpen && <Chat messages={messages} question={question} setQuestion={setQuestion} onAsk={ask} onClose={() => setChatOpen(false)} sending={chatSending} />}<button onClick={() => setChatOpen(true)} className="fixed bottom-6 right-6 grid h-14 w-14 place-items-center rounded-full bg-[#714b67] text-white shadow-xl shadow-[#714b67]/30" aria-label="Open leave assistant"><MessageCircle size={23} /></button></div>;
}

function Info({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) { return <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9c8e99]">{icon}{label}</p><p className="mt-2 text-sm font-semibold text-[#352f37]">{value}</p></div>; }
function AttendanceModal({ coordinates, error, saving, checkedIn, onClose, onSave }: { coordinates: string; error: string; saving: boolean; checkedIn: boolean; onClose: () => void; onSave: () => void }) { return <div className="fixed inset-0 z-40 grid place-items-center bg-[#25212a]/30 p-4"><section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold text-[#352f37]">{checkedIn ? "Check out" : "Check in"}</h2><p className="mt-1 text-sm text-[#9c8e99]">Confirm your location to {checkedIn ? "check out" : "check in"}.</p></div><button onClick={onClose} aria-label="Close"><X size={18} /></button></div><p className="mt-6 flex items-center gap-2 rounded-lg bg-[#eef5fb] p-3 text-xs font-semibold text-[#3d6f99]"><MapPin size={15} /> {coordinates}</p>{error && <p className="mt-3 rounded-lg bg-[#fbeaea] p-3 text-xs font-semibold text-[#b3261e]">{error}</p>}<div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-bold text-[#756c75]">Cancel</button><button onClick={onSave} disabled={saving} className="rounded-lg bg-[#714b67] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">{saving ? "Getting your location…" : checkedIn ? "Check out" : "Check in"}</button></div></section></div>; }
function Chat({ messages, question, setQuestion, onAsk, onClose, sending }: { messages: { from: string; text: string }[]; question: string; setQuestion: (value: string) => void; onAsk: (event: FormEvent) => void; onClose: () => void; sending: boolean }) { return <section className="fixed bottom-24 right-5 z-30 flex h-[470px] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-[#e6e0e5] bg-white shadow-2xl"><header className="flex items-center justify-between bg-[#714b67] p-4 text-white"><div className="flex items-center gap-2"><Bot size={19} /><strong>Interloop assistant</strong></div><button onClick={onClose} aria-label="Close assistant"><X size={18} /></button></header><div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.map((message, index) => <p key={`${message.from}-${index}`} className={`max-w-[85%] rounded-xl p-3 text-sm leading-5 ${message.from === "user" ? "ml-auto bg-[#f3edf2] text-[#5c3a54]" : "bg-[#fbf8fa] text-[#756c75]"}`}>{message.text}</p>)}{sending && <p className="max-w-[85%] rounded-xl bg-[#fbf8fa] p-3 text-sm leading-5 text-[#9c8e99]">Typing…</p>}</div><form onSubmit={onAsk} className="flex gap-2 border-t border-[#eee9ed] p-3"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about leave or payroll" disabled={sending} className="min-w-0 flex-1 rounded-lg border border-[#e6e0e5] px-3 text-sm outline-none focus:border-[#714b67] disabled:opacity-60" /><button disabled={sending} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#714b67] text-white disabled:opacity-60" aria-label="Send question"><Send size={16} /></button></form></section>; }
