import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeading } from "@/components/ui/PageBits";
import { downloadFile } from "@/lib/api-client";

type ReportFormat = "xlsx" | "pdf";

export default function ReportsPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<ReportFormat | null>(null);
  const [error, setError] = useState("");

  const handleDownload = async (format: ReportFormat) => {
    setError("");
    setPending(format);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      await downloadFile(
        `/reports/employees-summary?format=${format}`,
        `employee-summary-report-${stamp}.${format}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the report.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeading
        eyebrow="People operations"
        title="Reports"
        description="Generate a full employee summary — profile, contract, time off, and attendance — as a downloadable file."
      />
      <div className="rounded-xl border border-[#e6e0e5] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-bold text-[#352f37]">Employee summary report</h2>
        <p className="mt-1 max-w-2xl text-sm text-[#756c75]">
          One row per employee: status, department, position, wage, contract status, approved time off this
          year, pending requests, and attendance. Always reflects the latest data at the moment you download it.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleDownload("xlsx")}
            disabled={pending !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-[#714b67] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {pending === "xlsx" ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            Generate Excel Report
          </button>
          <button
            type="button"
            onClick={() => navigate("/reports/employee-summary")}
            disabled={pending !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-[#e6e0e5] bg-white px-4 py-2.5 text-sm font-bold text-[#756c75] disabled:opacity-60"
          >
            {pending === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Generate PDF Report
          </button>
        </div>
        {error && <p className="mt-4 rounded-lg bg-[#fdecec] p-3 text-sm font-semibold text-[#b3261e]">{error}</p>}
        <p className="mt-5 text-xs text-[#9c8e99]">
          Note: attendance figures are sample placeholder data until real check-in/check-out tracking is built —
          every other column reflects live employee, contract, and time-off records.
        </p>
      </div>
    </div>
  );
}
