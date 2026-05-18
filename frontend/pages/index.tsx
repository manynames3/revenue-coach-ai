import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock3,
  FilePlus2,
  MessageSquareText,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Call, DashboardOverview } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ReadyState {
  status: string;
  checks: {
    database: boolean;
    ai_configured: boolean;
    aws_bucket_configured: boolean;
  };
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(value)}%`;
}

function statusLabel(status: Call["status"]) {
  return status.replace(/_/g, " ");
}

function statusClass(status: Call["status"]) {
  if (status === "analyzed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "failed") return "bg-rose-50 text-rose-700 border-rose-200";
  if (status === "analyzing" || status === "transcribing") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "transcribed") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

const revenueUseCases = [
  {
    title: "Practice before high-stakes calls",
    detail: "Turn weak score categories into drills for discovery, objections, and decision clarity.",
    icon: Target,
  },
  {
    title: "Coach from real buyer signal",
    detail: "Use pain depth, urgency, money readiness, and resistance to pick the next manager action.",
    icon: Brain,
  },
  {
    title: "Recover revenue after the call",
    detail: "Use follow-up drafts and call notes to tighten next steps before deals stall.",
    icon: MessageSquareText,
  },
];

function StatTile({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-slate-100 text-slate-700">
        <FilePlus2 className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-black text-slate-950">No calls reviewed yet</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
        Add a transcript or audio file to generate a scorecard and coaching plan.
      </p>
      <Link
        href="/calls/new"
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
      >
        <FilePlus2 className="h-4 w-4" aria-hidden="true" />
        Add first call
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [ready, setReady] = useState<ReadyState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [overviewResponse, callsResponse, readyResponse] = await Promise.all([
          fetch(`${API_URL}/dashboard/overview`),
          fetch(`${API_URL}/calls`),
          fetch(`${API_URL}/ready`),
        ]);

        if (!overviewResponse.ok || !callsResponse.ok || !readyResponse.ok) {
          throw new Error("Dashboard data is unavailable.");
        }

        const [overview, callRows, readyState] = await Promise.all([
          overviewResponse.json(),
          callsResponse.json(),
          readyResponse.json(),
        ]);

        if (!cancelled) {
          setData(overview);
          setCalls(callRows);
          setReady(readyState);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load dashboard.");
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const needsReview = useMemo(
    () => calls.filter((call) => call.status === "transcribed" || call.status === "failed").slice(0, 5),
    [calls]
  );

  const activeCalls = useMemo(
    () => calls.filter((call) => call.status === "transcribing" || call.status === "analyzing").length,
    [calls]
  );

  const weakestDimension = useMemo(() => {
    if (!data?.recent_scores.length) return null;

    const totals: Record<string, { total: number; count: number }> = {};
    data.recent_scores.forEach((score) => {
      Object.entries(score.scores || {}).forEach(([key, value]) => {
        totals[key] = totals[key] || { total: 0, count: 0 };
        totals[key].total += value;
        totals[key].count += 1;
      });
    });

    return Object.entries(totals)
      .map(([key, value]) => ({ key, average: value.count ? value.total / value.count : 0 }))
      .sort((a, b) => a.average - b.average)[0];
  }, [data]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-rose-200 bg-rose-50 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" aria-hidden="true" />
          <div>
            <h1 className="text-base font-black text-rose-950">Dashboard unavailable</h1>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-5">
        <div className="h-24 animate-pulse rounded-lg bg-white" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-lg bg-white" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase text-blue-700">Manager workspace</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Sales coaching dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review call quality, surface coaching priorities, and move reps toward cleaner discovery.
          </p>
        </div>
        <Link
          href="/calls/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
        >
          <FilePlus2 className="h-4 w-4" aria-hidden="true" />
          New call
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Reps" value={data.total_reps} detail="Active sellers in review" icon={Users} />
        <StatTile label="Calls" value={data.total_calls} detail={`${activeCalls} currently processing`} icon={Clock3} />
        <StatTile label="Analyzed" value={data.analyzed_calls} detail="Scorecards completed" icon={CheckCircle2} />
        <StatTile label="Avg score" value={formatScore(data.average_score)} detail="Across analyzed calls" icon={TrendingUp} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-base font-black text-slate-950">Revenue practice loop</h2>
            <p className="text-sm text-slate-500">Move from scorecard insight to repeatable seller behavior.</p>
          </div>
          <Link href="/practice" className="inline-flex items-center gap-1 text-sm font-bold text-blue-700">
            Open practice lab
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
          {revenueUseCases.map((useCase) => {
            const Icon = useCase.icon;
            return (
              <Link key={useCase.title} href="/practice" className="rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
                <div className="mb-3 flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-black text-slate-950">{useCase.title}</h3>
                </div>
                <p className="text-sm leading-6 text-slate-600">{useCase.detail}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-black text-slate-950">Recent scorecards</h2>
              <p className="text-sm text-slate-500">Newest analyzed conversations</p>
            </div>
            <Link href="/calls/new" className="inline-flex items-center gap-1 text-sm font-bold text-blue-700">
              Add call
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {data.recent_scores.length === 0 ? (
            <div className="p-5">
              <EmptyState />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recent_scores.map((score) => (
                <Link
                  key={score.call_id}
                  href={`/calls/${score.call_id}`}
                  className="grid gap-3 px-5 py-4 transition-colors hover:bg-slate-50 md:grid-cols-[1fr_120px_120px]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{score.lead_name || "Unknown lead"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Analyzed {new Date(score.analyzed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400">Score</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{formatScore(score.overall_score)}</p>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-600">
                      Review
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                <BarChart3 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-950">Coaching priority</h2>
                {weakestDimension ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    The lowest recent category is{" "}
                    <span className="font-black text-slate-950">{weakestDimension.key.replace(/_/g, " ")}</span> at{" "}
                    <span className="font-black text-slate-950">{formatScore(weakestDimension.average)}</span>.
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-slate-600">Analyze calls to reveal the first coaching theme.</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-950">System readiness</h2>
                <p className="mt-1 text-sm text-slate-500">{ready?.status || "checking"}</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            </div>
            <div className="mt-4 space-y-2">
              {[
                ["Database", ready?.checks.database],
                ["AI config", ready?.checks.ai_configured],
                ["Audio bucket", ready?.checks.aws_bucket_configured],
              ].map(([label, ok]) => (
                <div key={label as string} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600">{label as string}</span>
                  <span className={`font-black ${ok ? "text-emerald-700" : "text-amber-700"}`}>
                    {ok ? "Ready" : "Needs config"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-black text-slate-950">Needs attention</h2>
              <p className="text-sm text-slate-500">Calls ready for review or recovery</p>
            </div>
            {needsReview.length === 0 ? (
              <p className="p-5 text-sm leading-6 text-slate-500">No blocked or ready-to-analyze calls right now.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {needsReview.map((call) => (
                  <Link key={call.id} href={`/calls/${call.id}`} className="block px-5 py-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-bold text-slate-950">{call.lead_name || "Untitled call"}</p>
                      <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-bold ${statusClass(call.status)}`}>
                        {statusLabel(call.status)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
