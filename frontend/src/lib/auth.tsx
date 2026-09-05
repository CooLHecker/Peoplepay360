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
  const signOut = async () => { try { await apiClient.post("/auth/logout", { all_sessions: false }); } catch { /* offline logout still clears local access */ } localStorage.removeItem("peoplepay_access_token"); localStorage.removeItem("peoplepay_session"); localStorage.removeItem("peoplepay_demo_session"); setSessionState(null); };
  return <AuthContext.Provider value={{ session, loading, signOut, setSession }}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
export function isAdmin(roles: string[]) { return roles.some((role) => ["admin", "hr_manager", "hr_payroll_admin", "hr_payroll_user"].includes(role)); }