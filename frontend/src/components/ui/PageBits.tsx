import { ArrowUpRight, Search, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#9c8e99]">{eyebrow}</p><h1 className="text-4xl font-bold tracking-tight text-[#5c3a54]">{title}</h1><p className="mt-2 max-w-2xl text-sm text-[#756c75]">{description}</p></div>{action}</div>;
}

export function Metric({ label, value, detail, tone = "plum" }: { label: string; value: string; detail: string; tone?: "plum" | "green" | "amber" | "blue" }) {
  const colors = { plum: "bg-[#f3edf2] text-[#714b67]", green: "bg-[#eef8f2] text-[#27804d]", amber: "bg-[#fff7e7] text-[#a36b12]", blue: "bg-[#eef5fb] text-[#3d6f99]" };
  return <div className="rounded-xl border border-[#e6e0e5] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9c8e99]">{label}</p><div className="mt-3 flex items-end justify-between gap-3"><strong className="text-3xl font-bold text-[#352f37]">{value}</strong><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${colors[tone]}`}>{detail}</span></div></div>;
}

export function Toolbar({ placeholder = "Search records", onSearch }: { placeholder?: string; onSearch: (value: string) => void }) {
  return <div className="mb-4 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b2a6ae]" /><input className="h-11 w-full rounded-lg border border-[#e6e0e5] bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-[#b2a6ae] focus:border-[#714b67] focus:ring-4 focus:ring-[#714b67]/10" placeholder={placeholder} onChange={(event) => onSearch(event.target.value)} /></label><button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#e6e0e5] bg-white px-4 text-sm font-bold text-[#756c75] hover:border-[#714b67] hover:text-[#714b67]"><SlidersHorizontal size={16} /> Filters</button></div>;
}

export function Status({ children }: { children: string }) {
  const style = children.toLowerCase().includes("approved") || children.toLowerCase().includes("completed") || children.toLowerCase().includes("active") ? "bg-[#eef8f2] text-[#27804d]" : children.toLowerCase().includes("pending") || children.toLowerCase().includes("draft") ? "bg-[#fff7e7] text-[#a36b12]" : "bg-[#f3edf2] text-[#714b67]";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{children}</span>;
}

export function EmptyLink({ children }: { children: ReactNode }) {
  return <button className="inline-flex items-center gap-1 text-sm font-bold text-[#714b67] hover:text-[#5c3a54]">{children}<ArrowUpRight size={15} /></button>;
}

export const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);