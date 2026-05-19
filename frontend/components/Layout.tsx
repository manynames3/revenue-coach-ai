import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { BarChart3, FilePlus2, LayoutDashboard, Megaphone, PlayCircle, Settings, ShieldCheck, Target, Users } from "lucide-react";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Sales Page", icon: Megaphone },
  { href: "/demo", label: "Demo", icon: PlayCircle },
  { href: "/practice", label: "Practice Lab", icon: Target },
  { href: "/calls/new", label: "New Call", icon: FilePlus2 },
  { href: "/reps", label: "Reps", icon: Users },
  { href: "/account", label: "Account", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f6f8ff] text-[#08043f]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-[#dfe4ff] bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-[#dfe4ff] px-5 py-5">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5c67ff] text-white">
                <BarChart3 className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xl font-extrabold italic text-[#5c67ff]">RevenueCoach</span>
                <span className="block text-xs font-semibold text-[#5a5886]">Sales coaching workspace</span>
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
                      ? "bg-[#090044] text-white"
                      : "text-[#4c4a7d] hover:bg-[#eef1ff] hover:text-[#090044]"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[#dfe4ff] p-4">
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
        <header className="sticky top-0 z-10 border-b border-[#dfe4ff] bg-white/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-sm font-black text-[#090044]">
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
              RevenueCoach
            </Link>
            <Link
              href="/calls/new"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-[#090044] px-3 text-sm font-bold text-white"
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
                    active ? "bg-[#090044] text-white" : "bg-[#eef1ff] text-[#4c4a7d]"
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
