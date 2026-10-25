import type { ReactNode } from "react";
import Link from "next/link";
import { LineChart } from "lucide-react";

export const inputClass = "w-full rounded-md border border-[#cbd2f7] bg-white px-3 py-2.5 text-sm text-[#090044] disabled:bg-[#f6f8ff]";
export const primaryClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#090044] px-5 py-2 text-sm font-semibold text-white hover:bg-[#211967] disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#cbd2f7] px-4 py-2 text-sm font-semibold text-[#312f61] hover:bg-[#f6f8ff] disabled:opacity-50";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-[#312f61]">{label}</span>{children}</label>;
}

export function Notice({ message, success = false }: { message: string; success?: boolean }) {
  if (!message) return null;
  return <p role={success ? "status" : "alert"} className={"rounded-md border p-3 text-sm leading-6 " +
    (success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800")}>{message}</p>;
}

export function PublicHeader() {
  return <header className="border-b border-[#dfe4ff] bg-white">
    <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
      <Link href="/sales" className="flex items-center gap-3 text-2xl font-bold italic text-[#5c67ff]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5c67ff] text-white"><LineChart className="h-5 w-5" aria-hidden="true" /></span>RevenueCoach
      </Link>
      <nav aria-label="Website" className="flex items-center gap-5 text-sm font-semibold text-[#312f61]">
        <Link href="/demo">Demo</Link><Link href="/pilot">Paid pilot</Link><Link href="/login">Sign in</Link>
      </nav>
    </div>
  </header>;
}
