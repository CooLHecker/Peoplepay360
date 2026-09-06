import { BriefcaseBusiness, CalendarDays, ChevronDown, CircleHelp, FileBarChart, LayoutDashboard, LogOut, Menu, Users, WalletCards, X } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { isAdmin, useAuth } from "@/lib/auth";
import NotificationsPanel from "@/components/layout/NotificationsPanel";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, admin: true },
  { to: "/employees", label: "Employees", icon: Users, admin: true },
  { to: "/attendance", label: "Attendance", icon: CalendarDays, admin: false },
  { to: "/time-off", label: "Time off", icon: BriefcaseBusiness, admin: false },
  { to: "/payroll", label: "Payroll", icon: WalletCards, admin: false },
  { to: "/reports", label: "Reports", icon: FileBarChart, admin: true }
];

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  // The Reports route (and its API) is Admin-only. Previously every nav
  // item rendered unconditionally, so non-admin users saw "Reports" in
  // the sidebar, clicked it, and were silently redirected to
  // /my-dashboard by <RequireSession admin> — indistinguishable from the
  // report simply not generating. Filter the nav to match the access
  // that already exists at the route/API level.
  const admin = isAdmin(session?.roles ?? []);
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.admin || admin);

  const handleLogout = () => {
    setProfileOpen(false);
    void signOut().then(() => navigate("/login"));
  };

  return (
    <div className="min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[#e6e0e5] bg-white/95 px-5 py-6 shadow-[14px_0_36px_rgba(113,75,103,0.04)] transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-10 flex items-center justify-between px-2">
          <NavLink to="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#714b67] text-lg font-bold text-white shadow-lg shadow-[#714b67]/20">P</span>
            <span><strong className="block text-lg leading-none text-[#5c3a54]">PeoplePay</strong><small className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9c8e99]">people operations</small></span>
          </NavLink>
          <button className="text-[#9c8e99] lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b2a6ae]">Workspace</p>
        <nav className="space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return <NavLink key={item.to} to={item.to} end={item.to === "/"} onClick={() => setMobileOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-lg border-r-[3px] px-3 py-3 text-sm font-semibold transition ${isActive ? "border-[#714b67] bg-[#f3edf2] text-[#714b67]" : "border-transparent text-[#756c75] hover:bg-[#fbf8fa] hover:text-[#714b67]"}`}><Icon size={18} strokeWidth={1.8} />{item.label}</NavLink>;
          })}
        </nav>
        <div className="mt-auto border-t border-[#eee9ed] pt-5">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-[#756c75] hover:bg-[#fbf8fa]"><CircleHelp size={18} />Help center</button>
          <div className="relative mt-4">
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              className="flex w-full items-center gap-3 rounded-xl bg-[#fbf8fa] p-3 text-left hover:bg-[#f3edf2]"
            >
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#d8c4d3] text-sm font-bold text-[#5c3a54]">A</div>
              <div className="min-w-0"><p className="truncate text-sm font-bold text-[#352f37]">Admin</p><p className="text-xs text-[#9c8e99]">HR administrator</p></div>
              <ChevronDown size={15} className={`ml-auto text-[#9c8e99] transition-transform ${profileOpen ? "rotate-180" : ""}`} />
            </button>
            {profileOpen && (
              <div role="menu" className="absolute bottom-full left-0 z-40 mb-2 w-full overflow-hidden rounded-lg border border-[#e6e0e5] bg-white shadow-[0_10px_30px_rgba(113,75,103,0.12)]">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-[#756c75] hover:bg-[#fbf8fa] hover:text-[#714b67]"
                >
                  <LogOut size={16} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
      {(mobileOpen || profileOpen) && (
        <button
          className="fixed inset-0 z-20 bg-[#25212a]/30 lg:bg-transparent"
          onClick={() => { setMobileOpen(false); setProfileOpen(false); }}
          aria-label="Close menu"
        />
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-[#e6e0e5] bg-white/85 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3"><button className="rounded-lg p-2 text-[#756c75] hover:bg-[#f3edf2] lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button><span className="hidden text-sm font-semibold text-[#9c8e99] sm:block">People operations /</span><span className="text-sm font-bold text-[#5c3a54]">{location.pathname === "/" ? "Overview" : NAV_ITEMS.find((item) => item.to === location.pathname)?.label ?? "Workspace"}</span></div>
          <div className="flex items-center gap-3"><span className="hidden items-center gap-2 rounded-full bg-[#eef8f2] px-3 py-1.5 text-xs font-bold text-[#27804d] sm:flex"><span className="h-2 w-2 rounded-full bg-[#34a45d]" />All systems operational</span><NotificationsPanel enabled={admin} /></div>
        </header>
        <main className="page-enter min-h-[calc(100vh-72px)] px-5 py-7 sm:px-8 lg:px-10"><Outlet /></main>
      </div>
    </div>
  );
}
