import { Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import DashboardPage from "@/routes/DashboardPage";
import EmployeesPage from "@/routes/EmployeesPage";
import AttendancePage from "@/routes/AttendancePage";
import TimeOffPage from "@/routes/TimeOffPage";
import PayrollPage from "@/routes/PayrollPage";
import LoginPage from "@/routes/LoginPage";
import NotFoundPage from "@/routes/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/time-off" element={<TimeOffPage />} />
        <Route path="/payroll" element={<PayrollPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
