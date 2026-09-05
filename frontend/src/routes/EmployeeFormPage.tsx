import { ArrowLeft, Save } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeading } from "@/components/ui/PageBits";
import { apiClient } from "@/lib/api-client";
import { findDemoEmployee } from "@/features/employees/data";

export default function EmployeeFormPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const existing = employeeId ? findDemoEmployee(employeeId) : undefined;
  const [name, setName] = useState(existing?.fullName ?? "");
  const [email, setEmail] = useState(existing ? `${existing.fullName.toLowerCase().replace(" ", ".")}@peoplepay.test` : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError("Employee name is required."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Please enter a valid email address."); return; }
    setSaving(true); setError("");
    try { const payload = { full_name: name, work_email: email }; if (employeeId) await apiClient.put(`/employees/${employeeId}`, payload); else await apiClient.post("/employees/", payload); navigate(employeeId ? `/employees/${employeeId}` : "/employees"); } catch { setError("Unable to save employee. Check the API connection and try again."); } finally { setSaving(false); }
  };
  return <div className="mx-auto max-w-[900px]"><Link to={employeeId ? `/employees/${employeeId}` : "/employees"} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#714b67]"><ArrowLeft size={16} /> Cancel</Link><PageHeading eyebrow="People directory" title={employeeId ? "Edit employee" : "New employee"} description="Capture the information your team needs to work well and get paid correctly." /><form onSubmit={submit} className="rounded-xl border border-[#e6e0e5] bg-white p-6"><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-bold text-[#352f37]">Employee name *<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label><label className="text-sm font-bold text-[#352f37]">Work email *<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="name@company.com" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label><label className="text-sm font-bold text-[#352f37]">Department<input placeholder="Department" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label><label className="text-sm font-bold text-[#352f37]">Job position<input placeholder="Job position" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label></div>{error && <p className="mt-5 rounded-lg bg-[#fff0f1] p-3 text-sm font-semibold text-[#b64e5b]">{error}</p>}<div className="mt-7 flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#714b67] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><Save size={16} />{saving ? "Saving employee..." : "Save employee"}</button></div></form></div>;
}
