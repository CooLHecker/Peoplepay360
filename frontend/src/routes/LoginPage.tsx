import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import interloopLogo from "@/assets/interloop-logo.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await apiClient.post<{ user: { id: number; email: string; employee_id: number | null; full_name?: string; is_active: boolean }; roles: string[]; access_token: string }>("/auth/login", { email: form.get("email"), password: form.get("password") });
      localStorage.setItem("interloop_access_token", response.access_token);
      setSession({ user: response.user, roles: response.roles });
      navigate(response.roles.length === 1 && response.roles[0] === "employee" ? "/my-dashboard" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Check your credentials and make sure the API is running.");
    } finally {
      setLoading(false);
    }
  };

  return <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]"><div className="hidden bg-[#5c3a54] p-12 text-white lg:flex lg:flex-col lg:justify-between"><div><div className="inline-flex items-center rounded-xl bg-white px-3 py-2 shadow-lg shadow-black/10"><img src={interloopLogo} alt="Interloop" className="h-6 w-auto" /></div><div className="mt-28 max-w-lg"><p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#d8c4d3]">Your people, in one place</p><h1 className="text-6xl font-bold leading-[1.05]">Work better, together.</h1><p className="mt-6 max-w-md text-lg leading-8 text-[#eadfeb]">A calmer way to manage your people operations, from first day to payday.</p></div></div><p className="text-xs text-[#d8c4d3]">Interloop Offline · Built for modern teams</p></div><div className="flex items-center justify-center bg-[#fbfafb] p-6"><form onSubmit={submit} className="w-full max-w-[400px]"><div className="mb-8"><span className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-[#f3edf2] text-[#714b67]"><LockKeyhole size={20} /></span><h2 className="text-3xl font-bold text-[#352f37]">Welcome back</h2><p className="mt-2 text-sm text-[#756c75]">Sign in to your people operations workspace.</p></div><label className="mb-4 block text-sm font-bold text-[#352f37]">Work email<input name="email" type="email" required placeholder="you@company.com" className="mt-2 h-12 w-full rounded-lg border border-[#e6e0e5] bg-white px-4 text-sm outline-none focus:border-[#714b67] focus:ring-4 focus:ring-[#714b67]/10" /></label><label className="block text-sm font-bold text-[#352f37]">Password<span className="relative mt-2 block"><input name="password" type={showPassword ? "text" : "password"} required placeholder="Enter your password" className="h-12 w-full rounded-lg border border-[#e6e0e5] bg-white px-4 pr-12 text-sm outline-none focus:border-[#714b67] focus:ring-4 focus:ring-[#714b67]/10" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#714b67]" aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label><div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#756c75]"><input type="checkbox" className="accent-[#714b67]" /> Remember me</div><button disabled={loading} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#714b67] text-sm font-bold text-white disabled:opacity-60">{loading ? "Signing in..." : "Sign in"} {!loading && <ArrowRight size={16} />}</button>{error && <p className="mt-4 rounded-lg bg-[#fff7e7] p-3 text-xs font-semibold text-[#a36b12]">{error}</p>}</form></div></div>;
}
