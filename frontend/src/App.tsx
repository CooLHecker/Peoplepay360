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
import { isAdmin, useAuth } from "@/lib/auth";
import type { ReactElement } from "react";
import ModulePage from "@/routes/ModulePage";
import EmployeeLoginPage from "@/routes/EmployeeLoginPage";

function RequireSession({ children, admin = false }: { children: ReactElement; admin?: boolean }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center text-sm font-semibold text-[#714b67]">Loading your workspace...</div>;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
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
        <Route path="/employees/new" element={<RequireSession admin><EmployeeFormPage /></RequireSession>} />
        <Route path="/employees/:employeeId" element={<RequireSession admin><EmployeeDetailsPage /></RequireSession>} />
        <Route path="/employees/:employeeId/edit" element={<RequireSession admin><EmployeeFormPage /></RequireSession>} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/time-off" element={<TimeOffPage />} />
        <Route path="/payroll" element={<PayrollPage />} />
        <Route path="/contracts" element={<RequireSession admin><ContractsPage /></RequireSession>} />
        <Route path="/contracts/new" element={<RequireSession admin><ContractFormPage /></RequireSession>} />
        <Route path="/contracts/:contractId/edit" element={<RequireSession admin><ContractFormPage /></RequireSession>} />
        <Route path="/working-schedules" element={<RequireSession admin><SchedulesPage /></RequireSession>} />
        <Route path="/working-schedules/new" element={<RequireSession admin><ScheduleFormPage /></RequireSession>} />
        <Route path="/working-schedules/:scheduleId/edit" element={<RequireSession admin><ScheduleFormPage /></RequireSession>} />
        <Route path="/time-off/requests" element={<ModulePage module="requests" />} />
        <Route path="/time-off/allocations" element={<ModulePage module="allocations" />} />
        <Route path="/time-off/types" element={<RequireSession admin><ModulePage module="types" /></RequireSession>} />
        <Route path="/payroll/payruns" element={<RequireSession admin><ModulePage module="payruns" /></RequireSession>} />
        <Route path="/payroll/payslips" element={<ModulePage module="payslips" />} />
        <Route path="/payroll/salary-structures" element={<RequireSession admin><ModulePage module="structures" /></RequireSession>} />
        <Route path="/payroll/salary-rules" element={<RequireSession admin><ModulePage module="rules" /></RequireSession>} />
        <Route path="/reports" element={<RequireSession admin><ModulePage module="reports" /></RequireSession>} />
      </Route>
      <Route path="/my-dashboard" element={<RequireSession><EmployeeDashboardPage /></RequireSession>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
