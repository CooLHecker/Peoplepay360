import { KeyRound, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeading, Status, Toolbar } from "@/components/ui/PageBits";
import { apiClient, getApiOr } from "@/lib/api-client";
import { ROLE_LABELS, useAuth } from "@/lib/auth";
import type { Employee, RoleOption, UserAccount } from "@/types";

export default function UserManagementPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [grantingEmployee, setGrantingEmployee] = useState<Employee | null>(null);

  const load = () => {
    setLoading(true);
    void Promise.all([
      getApiOr<UserAccount[]>("/users/", []),
      getApiOr<RoleOption[]>("/users/roles", []),
      getApiOr<Employee[]>("/employees/", [])
    ]).then(([userList, roleList, employeeList]) => {
      setUsers(userList);
      setRoles(roleList);
      setEmployees(employeeList);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const employeesWithoutAccess = useMemo(
    () => employees.filter((employee) => !employee.hasLoginAccess),
    [employees]
  );

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        `${user.employeeName ?? ""} ${user.email} ${user.roles.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [users, query]
  );

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeading
        eyebrow="Access control"
        title="User Management"
        description="Assign HR and payroll roles, or promote an employee into an administrative position."
      />

      {error && <p className="mb-4 rounded-lg bg-[#fdeeee] p-3 text-sm font-semibold text-[#b3261e]">{error}</p>}

      <Toolbar onSearch={setQuery} placeholder="Search by name, email, or role" />

      <div className="overflow-hidden rounded-xl border border-[#e6e0e5] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="border-b border-[#eee9ed] bg-[#fbf8fa] text-xs uppercase tracking-wider text-[#9c8e99]">
              <tr>
                <th className="px-6 py-4">Account</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Roles</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebef]">
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-[#9c8e99]">
                    No accounts found.
                  </td>
                </tr>
              )}
              {filteredUsers.map((user) => {
                const isSelf = session?.user.id === user.id;
                return (
                  <tr key={user.id}>
                    <td className="px-6 py-4">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f3edf2] text-xs font-bold text-[#714b67]">
                        {(user.employeeName ?? user.email).slice(0, 1).toUpperCase()}
                      </span>
                      <strong className="ml-3 text-sm text-[#352f37]">{user.employeeName ?? "No linked employee"}</strong>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#756c75]">{user.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {user.roles.map((role) => (
                          <span key={role} className="inline-flex rounded-full bg-[#f3edf2] px-2.5 py-1 text-xs font-bold text-[#714b67]">
                            {ROLE_LABELS[role] ?? role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Status>{user.isActive ? "Active" : "Inactive"}</Status>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        disabled={isSelf}
                        title={isSelf ? "You cannot change your own roles" : undefined}
                        onClick={() => setEditingUser(user)}
                        className="text-sm font-bold text-[#714b67] disabled:cursor-not-allowed disabled:text-[#c9bfc7]"
                      >
                        Manage roles
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {employeesWithoutAccess.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-[#352f37]">Employees without login access</h2>
          <p className="mb-4 text-sm text-[#756c75]">
            Grant access to create a login before assigning HR or payroll roles.
          </p>
          <div className="overflow-hidden rounded-xl border border-[#e6e0e5] bg-white">
            <div className="divide-y divide-[#f0ebef]">
              {employeesWithoutAccess.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-sm font-bold text-[#352f37]">{employee.fullName}</p>
                    <p className="text-xs text-[#9c8e99]">{employee.workEmail ?? "No work email on file"}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!employee.workEmail}
                    onClick={() => setGrantingEmployee(employee)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#e6e0e5] bg-white px-4 py-2 text-sm font-bold text-[#714b67] disabled:cursor-not-allowed disabled:text-[#c9bfc7]"
                  >
                    <KeyRound size={15} /> Grant access
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {editingUser && (
        <RoleEditorModal
          user={editingUser}
          roles={roles}
          onClose={() => setEditingUser(null)}
          onSaved={(updated) => {
            setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
            setEditingUser(null);
          }}
          onError={setError}
        />
      )}

      {grantingEmployee && (
        <GrantAccessModal
          employee={grantingEmployee}
          roles={roles}
          onClose={() => setGrantingEmployee(null)}
          onGranted={() => {
            setGrantingEmployee(null);
            load();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

function RoleEditorModal({
  user,
  roles,
  onClose,
  onSaved,
  onError
}: {
  user: UserAccount;
  roles: RoleOption[];
  onClose: () => void;
  onSaved: (user: UserAccount) => void;
  onError: (message: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>(user.roles);
  const [saving, setSaving] = useState(false);
  const roleOptions = roles.length > 0 ? roles.map((role) => role.name) : user.roles;

  const toggle = (role: string) =>
    setSelected((prev) => (prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]));

  const save = async () => {
    if (selected.length === 0) {
      onError("Choose at least one role.");
      return;
    }
    setSaving(true);
    try {
      const updated = await apiClient.patch<UserAccount>(`/users/${user.id}/roles`, { role_names: selected });
      onSaved(updated);
      onError("");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update roles.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#25212a]/30 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#352f37]">Manage roles</h2>
            <p className="mt-1 text-sm text-[#9c8e99]">{user.employeeName ?? user.email}</p>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 space-y-2">
          {roleOptions.map((role) => (
            <label key={role} className="flex items-center gap-3 rounded-lg border border-[#e6e0e5] px-4 py-3 text-sm font-semibold text-[#352f37]">
              <input type="checkbox" checked={selected.includes(role)} onChange={() => toggle(role)} className="h-4 w-4 accent-[#714b67]" />
              {ROLE_LABELS[role] ?? role}
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-[#e6e0e5] px-4 py-2.5 text-sm font-bold text-[#756c75]">
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#714b67] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            <ShieldCheck size={16} /> {saving ? "Saving..." : "Save roles"}
          </button>
        </div>
      </section>
    </div>
  );
}

function GrantAccessModal({
  employee,
  roles,
  onClose,
  onGranted,
  onError
}: {
  employee: Employee;
  roles: RoleOption[];
  onClose: () => void;
  onGranted: () => void;
  onError: (message: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>(["employee"]);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const roleOptions = roles.length > 0 ? roles.map((role) => role.name) : ["employee"];

  const toggle = (role: string) =>
    setSelected((prev) => (prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]));

  const save = async () => {
    if (password.length < 8) {
      onError("Password must be at least 8 characters.");
      return;
    }
    if (selected.length === 0) {
      onError("Choose at least one role.");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/users/${employee.id}/grant-access`, { password, role_names: selected });
      onGranted();
      onError("");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not grant access.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#25212a]/30 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#352f37]">Grant login access</h2>
            <p className="mt-1 text-sm text-[#9c8e99]">{employee.fullName} · {employee.workEmail}</p>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <label className="mt-5 block text-sm font-bold text-[#352f37]">
          Temporary password
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-[#e6e0e5] px-4 text-sm outline-none focus:border-[#714b67] focus:ring-4 focus:ring-[#714b67]/10"
            placeholder="At least 8 characters"
          />
        </label>
        <div className="mt-5 space-y-2">
          {roleOptions.map((role) => (
            <label key={role} className="flex items-center gap-3 rounded-lg border border-[#e6e0e5] px-4 py-3 text-sm font-semibold text-[#352f37]">
              <input type="checkbox" checked={selected.includes(role)} onChange={() => toggle(role)} className="h-4 w-4 accent-[#714b67]" />
              {ROLE_LABELS[role] ?? role}
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-[#e6e0e5] px-4 py-2.5 text-sm font-bold text-[#756c75]">
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#714b67] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            <KeyRound size={16} /> {saving ? "Creating..." : "Create login"}
          </button>
        </div>
      </section>
    </div>
  );
}
