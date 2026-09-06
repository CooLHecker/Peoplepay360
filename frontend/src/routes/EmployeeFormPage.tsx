import { ArrowLeft, Eye, EyeOff, KeyRound, LocateFixed, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeading } from "@/components/ui/PageBits";
import { apiClient } from "@/lib/api-client";
import { findDemoEmployee } from "@/features/employees/data";
import type { Employee } from "@/types";

export default function EmployeeFormPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(employeeId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState(isEditing ? "" : "Gandhinagar, India");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [loadingExisting, setLoadingExisting] = useState(isEditing);

  const [createLogin, setCreateLogin] = useState(!isEditing);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    apiClient
      .get<Employee>(`/employees/${employeeId}`)
      .then((existing) => {
        if (cancelled) return;
        setName(existing.fullName);
        setEmail(existing.workEmail ?? "");
        setPhoneNumber(existing.phoneNumber ?? "");
        setLocation(existing.location ?? "");
        setDepartment(existing.departmentId ?? "");
        setPosition(existing.positionId ?? "");
        setDateOfJoining(existing.dateOfJoining ? existing.dateOfJoining.slice(0, 10) : "");
      })
      .catch(() => {
        if (cancelled) return;
        const demo = findDemoEmployee(employeeId);
        if (demo) {
          setName(demo.fullName);
          setEmail(demo.workEmail ?? `${demo.fullName.toLowerCase().replace(" ", ".")}@interloop.test`);
          setPhoneNumber(demo.phoneNumber ?? "");
          setLocation(demo.location ?? "");
          setDepartment(demo.departmentId ?? "");
          setPosition(demo.positionId ?? "");
          setDateOfJoining(demo.dateOfJoining ? demo.dateOfJoining.slice(0, 10) : "");
        }
      })
      .finally(() => { if (!cancelled) setLoadingExisting(false); });
    return () => { cancelled = true; };
  }, [employeeId]);

  // Fills the Location field with the browser's current GPS
  // coordinates, reverse-geocoded to a readable place name where
  // possible, so admins aren't stuck typing a location by hand or
  // stuck with the old hardcoded city.
  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) { setLocationError("Your browser doesn't support location access."); return; }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data: { display_name?: string } | null) => {
            setLocation(data?.display_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          })
          .catch(() => setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`))
          .finally(() => setLocating(false));
      },
      () => { setLocationError("Couldn't access your location. Check browser permissions and try again."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError("Employee name is required."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Please enter a valid email address."); return; }
    if (!isEditing && createLogin) {
      if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
      if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    }
    setSaving(true); setError("");
    try {
      const payload: Record<string, unknown> = {
        full_name: name,
        work_email: email,
        phone_number: phoneNumber || null,
        location: location || null,
        department: department || null,
        job_position: position || null,
        date_of_joining: dateOfJoining || null
      };
      if (!isEditing && createLogin) payload.password = password;
      const saved = employeeId
        ? await apiClient.put<Employee>(`/employees/${employeeId}`, payload)
        : await apiClient.post<Employee>("/employees/", payload);
      navigate(employeeId ? `/employees/${employeeId}` : `/employees/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save employee. Check the API connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingExisting) return <div className="mx-auto max-w-[900px] rounded-xl border border-[#e6e0e5] bg-white p-8 text-sm text-[#9c8e99]">Loading employee...</div>;

  return <div className="mx-auto max-w-[900px]"><Link to={employeeId ? `/employees/${employeeId}` : "/employees"} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#714b67]"><ArrowLeft size={16} /> Cancel</Link><PageHeading eyebrow="People directory" title={employeeId ? "Edit employee" : "New employee"} description="Capture the information your team needs to work well and get paid correctly." /><form onSubmit={submit} className="rounded-xl border border-[#e6e0e5] bg-white p-6"><div className="grid gap-5 sm:grid-cols-2">
    <label className="text-sm font-bold text-[#352f37]">Employee name *<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label>
    <label className="text-sm font-bold text-[#352f37]">Work email *<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="name@company.com" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label>
    <label className="text-sm font-bold text-[#352f37]">Phone number<input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} type="tel" placeholder="+91 98765 43210" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label>
    <label className="text-sm font-bold text-[#352f37]">Location
      <span className="mt-2 flex gap-2">
        <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, country" className="h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" />
        <button type="button" onClick={useCurrentLocation} disabled={locating} title="Use my current location" className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[#e6e0e5] px-3 text-sm font-bold text-[#714b67] hover:border-[#714b67] disabled:opacity-60"><LocateFixed size={16} />{locating ? "Locating..." : "Live"}</button>
      </span>
      {locationError && <span className="mt-1.5 block text-xs font-semibold text-[#b64e5b]">{locationError}</span>}
    </label>
    <label className="text-sm font-bold text-[#352f37]">Department<input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Department" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label>
    <label className="text-sm font-bold text-[#352f37]">Job position<input value={position} onChange={(event) => setPosition(event.target.value)} placeholder="Job position" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label>
    <label className="text-sm font-bold text-[#352f37]">Joining date<input value={dateOfJoining} onChange={(event) => setDateOfJoining(event.target.value)} type="date" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label>
  </div>

    {!isEditing && <div className="mt-7 rounded-xl border border-[#e6e0e5] bg-[#fbf8fa] p-5"><label className="flex items-center gap-3 text-sm font-bold text-[#352f37]"><input type="checkbox" checked={createLogin} onChange={(event) => setCreateLogin(event.target.checked)} className="h-4 w-4 accent-[#714b67]" /><span className="inline-flex items-center gap-2"><KeyRound size={16} className="text-[#714b67]" /> Create login access for this employee</span></label><p className="mt-1.5 pl-7 text-xs text-[#9c8e99]">Lets them sign in at the employee portal using their work email and this password.</p>
      {createLogin && <div className="mt-4 grid gap-5 pl-7 sm:grid-cols-2"><label className="text-sm font-bold text-[#352f37]">Password *<span className="relative mt-2 block"><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} placeholder="At least 8 characters" className="h-11 w-full rounded-lg border border-[#e6e0e5] bg-white px-3 pr-10 text-sm font-normal outline-none focus:border-[#714b67]" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#714b67]" aria-label="Toggle password visibility">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label><label className="text-sm font-bold text-[#352f37]">Confirm password *<input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type={showPassword ? "text" : "password"} placeholder="Re-enter password" className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] bg-white px-3 text-sm font-normal outline-none focus:border-[#714b67]" /></label></div>}
    </div>}

    {error && <p className="mt-5 rounded-lg bg-[#fff0f1] p-3 text-sm font-semibold text-[#b64e5b]">{error}</p>}<div className="mt-7 flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#714b67] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><Save size={16} />{saving ? "Saving employee..." : "Save employee"}</button></div></form></div>;
}
