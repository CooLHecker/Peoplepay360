import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";

const DEMO_EMPLOYEE_EMAIL = "employee@peoplepay.local";
const DEMO_EMPLOYEE_PASSWORD = "Employee@123";

export default function EmployeeLoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    if (form.get("email") === DEMO_EMPLOYEE_EMAIL && form.get("password") === DEMO_EMPLOYEE_PASSWORD) {
      localStorage.setItem("peoplepay_demo_session", "true");
      setSession({ user: { id: 1001, email: DEMO_EMPLOYEE_EMAIL, employee_id: 1042, full_name: "Demo Employee", is_active: true }, roles: ["employee"] });
      navigate("/my-dashboard");
      setLoading(false);
      return;
    }
    try {
      const response = await apiClient.post<{ user: { id: number; email: string; employee_id: number | null; full_name?: string; is_active: boolean }; roles: string[]; access_token: string }>("/auth/login", { email: form.get("email"), password: form.get("password") });
      if (!response.roles.includes("employee")) { setError("This account is not an employee account. Use the admin sign-in instead."); return; }
      localStorage.setItem("peoplepay_access_token", response.access_token);
      setSession({ user: response.user, roles: response.roles });
      navigate("/my-dashboard");
    } catch {
      setError("Unable to sign in. Check your credentials and make sure the API is running.");
    } finally {
      setLoading(false);
    }
  };
  return <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]"><div className="flex flex-col justify-between bg-[#714b67] p-8 text-white sm:p-12"><div><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-lg font-bold text-[#714b67]">P</span><strong className="text-lg">PeoplePay</strong></div><div className="mt-24 max-w-md"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eadfeb]">Employee workspace</p><h1 className="mt-4 text-5xl font-bold leading-tight">Everything you need, at a glance.</h1><p className="mt-6 text-lg leading-8 text-[#eadfeb]">Track your day, request time off, and stay close to your payroll and contract details.</p></div></div><p className="text-xs text-[#eadfeb]">PeoplePay · Secure employee access</p></div><div className="flex items-center justify-center bg-[#fbfafb] p-6"><form onSubmit={submit} className="w-full max-w-[410px]"><div className="mb-8"><span className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-[#f3edf2] text-[#714b67]"><LockKeyhole size={20} /></span><h2 className="text-3xl font-bold text-[#352f37]">Employee sign in</h2><p className="mt-2 text-sm text-[#756c75]">Access your personal PeoplePay workspace.</p></div><label className="block text-sm font-bold text-[#352f37]">Work email<input name="email" type="email" required placeholder="you@company.com" className="mt-2 h-12 w-full rounded-lg border border-[#e6e0e5] bg-white px-4 text-sm outline-none focus:border-[#714b67]" /></label><label className="mt-4 block text-sm font-bold text-[#352f37]">Password<span className="relative mt-2 block"><input name="password" type={showPassword ? "text" : "password"} required placeholder="Enter your password" className="h-12 w-full rounded-lg border border-[#e6e0e5] bg-white px-4 pr-12 text-sm outline-none focus:border-[#714b67]" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#714b67]" aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label><button disabled={loading} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#714b67] text-sm font-bold text-white disabled:opacity-60">{loading ? "Signing in..." : "Continue to my workspace"} {!loading && <ArrowRight size={16} />}</button>{error && <p className="mt-4 rounded-lg bg-[#fff0f1] p-3 text-sm font-semibold text-[#b64e5b]">{error}</p>}<button type="button" onClick={() => navigate("/login")} className="mt-6 w-full text-center text-sm font-bold text-[#714b67]">Admin sign in</button></form></div></div>;
}
