import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import DashboardPage from "@/routes/DashboardPage";
import EmployeesPage from "@/routes/EmployeesPage";
import AttendancePage from "@/routes/AttendancePage";
import TimeOffPage from "@/routes/TimeOffPage";
import PayrollPage from "@/routes/PayrollPage";
import LoginPage from "@/routes/LoginPage";
import NotFoundPage from "@/routes/NotFoundPage";
import EmployeeDetailsPage from "@/routes/EmployeeDetailsPage";
import EmployeeFormPage from "@/routes/EmployeeFormPage";
import EmployeeDashboardPage from "@/routes/EmployeeDashboardPage";
import ContractsPage from "@/routes/ContractsPage";
import ContractFormPage from "@/routes/ContractFormPage";
import SchedulesPage from "@/routes/SchedulesPage";
import ScheduleFormPage from "@/routes/ScheduleFormPage";
import PayslipsPage from "@/routes/PayslipsPage";
import { HR_WRITE_ROLES, hasAnyRole, isAdmin, useAuth } from "@/lib/auth";
import type { ReactElement } from "react";
import ModulePage from "@/routes/ModulePage";
import ReportsPage from "@/routes/ReportsPage";
import EmployeeLoginPage from "@/routes/EmployeeLoginPage";
import EmployeeReportPage from "@/routes/EmployeeReportPage";
import UserManagementPage from "@/routes/UserManagementPage";

// `admin` is the broad "works in HR operations" check (any of the four
// HR/admin roles). `roles` narrows that further to a specific set for
// pages the backend restricts more tightly than the general admin
// grouping (e.g. Reports is Admin-only; User Management is Admin + HR
// Manager) — segregating page access by actual role, not just a single
// admin/employee split.
function RequireSession({ children, admin = false, roles }: { children: ReactElement; admin?: boolean; roles?: string[] }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center text-sm font-semibold text-[#714b67]">Loading your workspace...</div>;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !hasAnyRole(session.roles, roles)) return <Navigate to="/my-dashboard" replace />;
  if (admin && !isAdmin(session.roles)) return <Navigate to="/my-dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/employee-login" element={<EmployeeLoginPage />} />
      <Route element={<RequireSession><AppLayout /></RequireSession>}>
        <Route path="/" element={<RequireSession admin><DashboardPage /></RequireSession>} />
        <Route path="/employees" element={<RequireSession admin><EmployeesPage /></RequireSession>} />
        <Route path="/employees/new" element={<RequireSession roles={HR_WRITE_ROLES}><EmployeeFormPage /></RequireSession>} />
        <Route path="/employees/:employeeId" element={<RequireSession admin><EmployeeDetailsPage /></RequireSession>} />
        <Route path="/employees/:employeeId/edit" element={<RequireSession roles={HR_WRITE_ROLES}><EmployeeFormPage /></RequireSession>} />
        <Route path="/reports/employee-summary" element={<RequireSession roles={["admin"]}><EmployeeReportPage /></RequireSession>} />
        <Route path="/user-management" element={<RequireSession roles={["admin", "hr_manager"]}><UserManagementPage /></RequireSession>} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/time-off" element={<TimeOffPage />} />
        <Route path="/payroll" element={<PayrollPage />} />
        <Route path="/contracts" element={<RequireSession admin><ContractsPage /></RequireSession>} />
        <Route path="/contracts/new" element={<RequireSession roles={HR_WRITE_ROLES}><ContractFormPage /></RequireSession>} />
        <Route path="/contracts/:contractId/edit" element={<RequireSession roles={HR_WRITE_ROLES}><ContractFormPage /></RequireSession>} />
        <Route path="/working-schedules" element={<RequireSession admin><SchedulesPage /></RequireSession>} />
        <Route path="/working-schedules/new" element={<RequireSession roles={HR_WRITE_ROLES}><ScheduleFormPage /></RequireSession>} />
        <Route path="/working-schedules/:scheduleId/edit" element={<RequireSession roles={HR_WRITE_ROLES}><ScheduleFormPage /></RequireSession>} />
        <Route path="/time-off/requests" element={<ModulePage module="requests" />} />
        <Route path="/time-off/allocations" element={<ModulePage module="allocations" />} />
        <Route path="/time-off/types" element={<RequireSession roles={HR_WRITE_ROLES}><ModulePage module="types" /></RequireSession>} />
        <Route path="/payroll/payruns" element={<RequireSession admin><ModulePage module="payruns" /></RequireSession>} />
        <Route path="/payroll/payslips" element={<PayslipsPage />} />
        <Route path="/payroll/salary-structures" element={<RequireSession admin><ModulePage module="structures" /></RequireSession>} />
        <Route path="/payroll/salary-rules" element={<RequireSession admin><ModulePage module="rules" /></RequireSession>} />
        <Route path="/reports" element={<RequireSession roles={["admin"]}><ReportsPage /></RequireSession>} />
      </Route>
      <Route path="/my-dashboard" element={<RequireSession><EmployeeDashboardPage /></RequireSession>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
