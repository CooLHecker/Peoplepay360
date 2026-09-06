import { CheckCircle2, FileText, Loader2, Play, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeading, Status, money } from "@/components/ui/PageBits";
import { apiClient } from "@/lib/api-client";
import type { PayrollRun } from "@/types";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface RunPayrollResult {
  periodYear: number;
  periodMonth: number;
  period: string;
  generated: number;
  skippedNoContract: number;
  skippedAlreadyExists: number;
  totalGross: number;
}

export default function PayrollPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RunPayrollResult | null>(null);

  const now = new Date();
  const currentPeriodLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  const loadRuns = () => {
    setLoading(true);
    apiClient
      .get<PayrollRun[]>("/payruns/")
      .then(setRuns)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load payroll history."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRuns(); }, []);

  const runPayroll = () => {
    setRunning(true);
    setError("");
    setResult(null);
    apiClient
      .post<RunPayrollResult>("/payruns/run", {})
      .then((res) => { setResult(res); loadRuns(); })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to run payroll. Please try again."))
      .finally(() => setRunning(false));
  };

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeading
        eyebrow="Compensation"
        title="Payroll"
        description="Run payroll for active employees and generate payslips."
        action={
          <Link to="/payroll/payslips" className="inline-flex items-center gap-2 rounded-lg border border-[#e6e0e5] bg-white px-4 py-2.5 text-sm font-bold text-[#756c75]">
            <FileText size={16} /> View payslips
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <section className="rounded-xl border border-[#e6e0e5] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3edf2] text-[#714b67]">
              <WalletCards size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#352f37]">{currentPeriodLabel} payroll</h2>
              <p className="text-sm text-[#9c8e99]">Generates one payslip per active employee for this month.</p>
            </div>
          </div>

          <div className="mt-8 rounded-xl bg-[#fbf8fa] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9c8e99]">What this does</p>
            <p className="mt-3 text-sm text-[#756c75]">
              Looks up every active employee&apos;s current contract wage and creates a payslip for {currentPeriodLabel}.
              Employees who already have a payslip for this period, or who have no contract covering it, are skipped
              automatically — safe to click more than once.
            </p>
          </div>

          <button
            onClick={runPayroll}
            disabled={running}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#714b67] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {running ? "Running payroll..." : `Run payroll for ${currentPeriodLabel}`}
          </button>

          {error && <p className="mt-4 rounded-lg bg-[#fdecec] p-3 text-sm font-semibold text-[#b3261e]">{error}</p>}

          {result && (
            <div className="mt-5 rounded-lg bg-[#eef8f2] p-4">
              <div className="flex items-center gap-2 text-[#27804d]">
                <CheckCircle2 size={18} />
                <strong className="text-sm">Payroll run complete for {result.period}</strong>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-[#3a6b52]">
                <li>{result.generated} payslip{result.generated === 1 ? "" : "s"} generated · {money(result.totalGross)} total gross</li>
                {result.skippedAlreadyExists > 0 && <li>{result.skippedAlreadyExists} employee(s) already had a payslip for this period</li>}
                {result.skippedNoContract > 0 && <li>{result.skippedNoContract} employee(s) skipped — no contract covers this period</li>}
              </ul>
              <Link to="/payroll/payslips" className="mt-3 inline-block text-sm font-bold text-[#27804d] underline">
                View generated payslips
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[#e6e0e5] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#352f37]">Payroll history</h2>
              <p className="mt-1 text-sm text-[#9c8e99]">Every period payroll has been run for</p>
            </div>
            <FileText size={20} className="text-[#9c8e99]" />
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-[#9c8e99]">Loading...</p>
          ) : runs.length === 0 ? (
            <p className="mt-6 text-sm text-[#9c8e99]">No payroll has been run yet. Use the button on the left to run your first payroll.</p>
          ) : (
            <div className="mt-5 divide-y divide-[#f0ebef]">
              {runs.map((run) => (
                <div key={run.id} className="flex items-center justify-between gap-3 py-4">
                  <div>
                    <p className="text-sm font-bold text-[#352f37]">{run.period}</p>
                    <p className="mt-1 text-xs text-[#9c8e99]">{run.employees} employees · {money(run.gross)}</p>
                  </div>
                  <Status>{run.status}</Status>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
