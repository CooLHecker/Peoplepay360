import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient } from "@/lib/api-client";

export interface SessionUser { id: number; email: string; employee_id: number | null; full_name?: string | null; is_active: boolean; }
export interface Session { user: SessionUser; roles: string[]; }
interface AuthContextValue { session: Session | null; loading: boolean; signOut: () => Promise<void>; setSession: (session: Session) => void; }
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() => { const stored = localStorage.getItem("peoplepay_session"); return stored ? JSON.parse(stored) as Session : null; });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("peoplepay_access_token")));
  useEffect(() => { if (!localStorage.getItem("peoplepay_access_token")) { setLoading(false); return; } void apiClient.get<Session>("/auth/me").then((current) => { setSessionState(current); localStorage.setItem("peoplepay_session", JSON.stringify(current)); }).catch(() => { localStorage.removeItem("peoplepay_access_token"); localStorage.removeItem("peoplepay_session"); }).finally(() => setLoading(false)); }, []);
  const setSession = (next: Session) => { setSessionState(next); localStorage.setItem("peoplepay_session", JSON.stringify(next)); };
  const signOut = async () => { try { await apiClient.post("/auth/logout", { all_sessions: false }); } catch { /* offline logout still clears local access */ } localStorage.removeItem("peoplepay_access_token"); localStorage.removeItem("peoplepay_session"); setSessionState(null); };
  return <AuthContext.Provider value={{ session, loading, signOut, setSession }}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }

// Human-readable labels for the fixed role set — mirrors RoleName in
// backend/app/models/role.py.
export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  hr_manager: "HR Manager",
  hr_payroll_user: "HR Payroll User",
  hr_payroll_admin: "HR Payroll Admin",
  employee: "Employee"
};
export const ALL_ROLE_NAMES = ["admin", "hr_manager", "hr_payroll_user", "hr_payroll_admin", "employee"];

// Creating/editing employee records, contracts, and working schedules is
// tighter than viewing them — mirrors each endpoint's `_WRITE_ROLES` in
// backend/app/api/v1/endpoints/{employees,contracts,schedules}.py.
// hr_payroll_user (payroll processing) can read these but not edit them.
export const HR_WRITE_ROLES = ["admin", "hr_manager", "hr_payroll_admin"];

export function hasAnyRole(userRoles: string[], allowed: string[]) { return userRoles.some((role) => allowed.includes(role)); }

// Any of the four HR/admin roles — the broad "this person works in HR
// operations" grouping used for most of the admin-side navigation.
export function isAdmin(roles: string[]) { return hasAnyRole(roles, ["admin", "hr_manager", "hr_payroll_admin", "hr_payroll_user"]); }

// Only Admin sees org-wide payroll/attendance reports — mirrors the
// stricter `_REPORT_ROLES` in backend/app/api/v1/endpoints/reports.py
// (narrower than the general isAdmin() HR grouping above).
export function canViewReports(roles: string[]) { return hasAnyRole(roles, ["admin"]); }

// Deciding who holds which role is scoped to Admin + HR Manager —
// mirrors `_ROLE_MANAGERS` in backend/app/api/v1/endpoints/users.py.
export function canManageUsers(roles: string[]) { return hasAnyRole(roles, ["admin", "hr_manager"]); }