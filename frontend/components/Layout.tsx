import React from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FilePlus2, LayoutDashboard, LineChart, LogOut, PlayCircle, Settings, ShieldCheck, Target, Users } from "lucide-react";
import { useAuth } from "./AuthContext";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/welcome", label: "Getting Started", icon: PlayCircle },
  { href: "/practice", label: "Practice Lab", icon: Target },
  { href: "/calls/new", label: "New Call", icon: FilePlus2 },
  { href: "/reps", label: "Reps", icon: Users },
  { href: "/account", label: "Account", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  const items = navigation.filter((item) => user?.role === "manager" || item.href !== "/reps");
  async function signOut() {
    try { await logout(); await router.push("/login"); }
    catch { setLogoutError("Unable to sign out. Retry when the connection is restored."); }
  }

  return (
    <div className="min-h-screen bg-[#f6f8ff] text-[#08043f]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-[#dfe4ff] bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-[#dfe4ff] px-5 py-5">
            <Link href="/dashboard" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5c67ff] text-white">
                <LineChart className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xl font-extrabold italic text-[#5c67ff]">RevenueCoach</span>
                <span className="block text-xs font-semibold text-[#5a5886]">Sales coaching workspace</span>
              </span>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {items.map((item) => {
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
                Private workspace
              </div>
              <p className="mt-2 text-xs leading-5 text-emerald-900">
                {user?.name} · {user?.role}
              </p>
            </div>
            <button onClick={signOut} className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#4c4a7d]">
              <LogOut className="h-4 w-4" aria-hidden="true" />Sign out
            </button>
            {logoutError && <p role="alert" className="mt-2 text-xs text-rose-700">{logoutError}</p>}
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-[#dfe4ff] bg-white/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/dashboard" className="flex items-center gap-2 text-base font-extrabold italic text-[#5c67ff]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5c67ff] text-white"><LineChart className="h-4 w-4" aria-hidden="true" /></span>
              RevenueCoach
            </Link>
            <Link
              href="/calls/new"
              title="New call"
              aria-label="New call"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-[#090044] px-3 text-sm font-bold text-white"
            >
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">New call</span>
            </Link>
            <button onClick={signOut} title="Sign out" aria-label="Sign out" className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center text-[#4c4a7d]"><LogOut className="h-4 w-4" /></button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
            {items.map((item) => {
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
