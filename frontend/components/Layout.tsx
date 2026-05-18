import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { BarChart3, FilePlus2, LayoutDashboard, Megaphone, ShieldCheck, Target, Users } from "lucide-react";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Sales Page", icon: Megaphone },
  { href: "/practice", label: "Practice Lab", icon: Target },
  { href: "/calls/new", label: "New Call", icon: FilePlus2 },
  { href: "/reps", label: "Reps", icon: Users },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-5 py-5">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white">
                <BarChart3 className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-black text-slate-950">RevenueCoach AI</span>
                <span className="block text-xs font-medium text-slate-500">Sales coaching workspace</span>
              </span>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const active = isActive(router.pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold transition-colors ${
                    active
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-800">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                AWS demo live
              </div>
              <p className="mt-2 text-xs leading-5 text-emerald-900">
                API, database, and audio storage are connected for recruiter review.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-sm font-black text-slate-950">
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
              RevenueCoach AI
            </Link>
            <Link
              href="/calls/new"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-bold text-white"
            >
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              New
            </Link>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
            {navigation.map((item) => {
              const active = isActive(router.pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-bold ${
                    active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
