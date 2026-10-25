import { apiFetch, callHref } from "../lib/api";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../components/AuthContext";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FilePlus2,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Call, DashboardOverview } from "../types";



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
  return "bg-[#fbfcff] text-[#5a5886] border-[#dfe4ff]";
}

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
    <div className="rounded-lg border border-[#dfe4ff] bg-white p-4 shadow-[0_12px_30px_rgba(9,0,68,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-[#5a5886]">{label}</p>
          <p className="mt-2 text-3xl font-black text-[#090044]">{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eef1ff] text-[#5c67ff]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-sm text-[#5a5886]">{detail}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-[#bfc6ff] bg-white p-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-[#eef1ff] text-[#5c67ff]">
        <FilePlus2 className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-black text-[#090044]">No calls reviewed yet</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#5a5886]">
        Add a transcript or audio file to generate a scorecard and coaching plan.
      </p>
      <Link
        href="/calls/new"
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-[#090044] px-4 text-sm font-bold text-white hover:bg-[#1b1670]"
      >
        <FilePlus2 className="h-4 w-4" aria-hidden="true" />
        Add first call
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [overviewResponse, callsResponse] = await Promise.all([
          apiFetch("/dashboard/overview"),
          apiFetch("/calls"),
        ]);

        if (!overviewResponse.ok || !callsResponse.ok) {
          throw new Error("Dashboard data is unavailable.");
        }

        const [overview, callRows] = await Promise.all([
          overviewResponse.json(),
          callsResponse.json(),
        ]);

        if (!cancelled) {
          setData(overview);
          setCalls(callRows);
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
      if (score.source_mode !== "model" || score.rubric_version !== data.current_rubric_version) return;
      Object.entries(score.scores || {}).forEach(([key, value]) => {
        if (value === null) return;
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
          <p className="text-xs font-black uppercase text-[#1684ff]">{user?.role === "manager" ? "Team workspace" : "My workspace"}</p>
          <h1 className="mt-1 text-3xl font-black text-[#090044]">Sales coaching dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4c4a7d]">
            Review call quality, surface coaching priorities, and move reps toward cleaner discovery.
          </p>
        </div>
        <Link
          href="/calls/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#090044] px-4 text-sm font-bold text-white hover:bg-[#1b1670]"
        >
          <FilePlus2 className="h-4 w-4" aria-hidden="true" />
          New call
        </Link>
      </div>

      {data.total_calls === 0 && <section className="flex flex-wrap items-center justify-between gap-4 border-y border-[#dfe4ff] py-5">
        <div><h2 className="font-bold text-[#090044]">Start with a call, not a blank scorecard.</h2>
          <p className="mt-1 text-sm text-[#5a5886]">Set up your team context and review a labeled sample before uploading customer data.</p></div>
        <Link href="/welcome" className="inline-flex items-center gap-2 text-sm font-bold text-[#3d42ff]">Get started<ArrowRight className="h-4 w-4" /></Link>
      </section>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Reps" value={data.total_reps} detail="Active sellers in review" icon={Users} />
        <StatTile label="Calls" value={data.total_calls} detail={`${activeCalls} currently processing`} icon={Clock3} />
        <StatTile label="Analyzed" value={data.analyzed_calls} detail="Scorecards completed" icon={CheckCircle2} />
        <StatTile label="Avg score" value={formatScore(data.average_score)} detail="Real calls, current rubric" icon={TrendingUp} />
      </div>

      <section className="border-y border-[#dfe4ff] py-5">
        <div className="flex items-center justify-between gap-4"><h2 className="font-bold text-[#090044]">Coaching follow-through</h2>
          <Link href="/practice" className="inline-flex items-center gap-1 text-sm font-bold text-[#3d42ff]">Practice Lab<ArrowRight className="h-4 w-4" /></Link></div>
        <dl className="mt-4 grid grid-cols-3 gap-4">
          {[["Assigned", data.coaching.assigned], ["Awaiting review", data.coaching.completed], ["Reviewed", data.coaching.reviewed]].map(([label, count]) =>
            <div key={label}><dt className="text-sm text-[#5a5886]">{label}</dt><dd className="mt-1 text-2xl font-bold text-[#090044]">{count}</dd></div>)}
        </dl>
      </section>

      {data.skill_comparisons.length > 0 && <section className="border-b border-[#dfe4ff] pb-5">
        <h2 className="font-bold text-[#090044]">Next-call skill checks</h2><p className="mt-1 text-sm text-[#5a5886]">Same rep and rubric. A score change is not proof of a revenue gain.</p>
        <div className="mt-4 divide-y divide-[#dfe4ff]">{data.skill_comparisons.map((item) =>
          <Link href="/practice" key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span><strong>{item.rep_name}</strong> · {item.skill.replaceAll("_", " ")}{item.is_sample ? " · Sample" : ""}</span>
            <span className="font-bold">{Math.round(item.baseline)} → {Math.round(item.latest)} ({item.delta > 0 ? "+" : ""}{item.delta})</span>
          </Link>)}</div>
      </section>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="rounded-lg border border-[#dfe4ff] bg-white shadow-[0_12px_30px_rgba(9,0,68,0.04)] xl:col-span-2">
          <div className="flex items-center justify-between border-b border-[#dfe4ff] px-5 py-4">
            <div>
              <h2 className="text-base font-black text-[#090044]">Recent scorecards</h2>
              <p className="text-sm text-[#5a5886]">Newest analyzed conversations</p>
            </div>
            <Link href="/calls/new" className="inline-flex items-center gap-1 text-sm font-bold text-[#3d42ff]">
              Add call
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {data.recent_scores.length === 0 ? (
            <div className="p-5">
              <EmptyState />
            </div>
          ) : (
            <div className="divide-y divide-[#eef1ff]">
              {data.recent_scores.map((score) => (
                <Link
                  key={score.call_id}
                  href={callHref(score.call_id)}
                  className="grid gap-3 px-5 py-4 transition-colors hover:bg-[#fbfcff] md:grid-cols-[1fr_120px_120px]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#090044]">{score.lead_name || "Unknown lead"}</p>
                    <p className="mt-1 text-xs text-[#5a5886]">
                      {score.source_mode === "sample" ? "Illustrative sample · " : score.source_mode === "legacy" ? "Historical · " : ""}
                      Analyzed {new Date(score.analyzed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-[#8c8ab3]">Score</p>
                    <p className="mt-1 text-lg font-black text-[#090044]">{formatScore(score.overall_score)}</p>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="inline-flex h-8 items-center gap-1 rounded-md border border-[#dfe4ff] px-3 text-xs font-bold text-[#4c4a7d]">
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
          <section className="rounded-lg border border-[#dfe4ff] bg-white p-5 shadow-[0_12px_30px_rgba(9,0,68,0.04)]">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eef1ff] text-[#5c67ff]">
                <BarChart3 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-black text-[#090044]">Coaching priority</h2>
                {weakestDimension ? (
                  <p className="mt-2 text-sm leading-6 text-[#4c4a7d]">
                    The lowest recent category is{" "}
                    <span className="font-black text-[#090044]">{weakestDimension.key.replace(/_/g, " ")}</span> at{" "}
                    <span className="font-black text-[#090044]">{formatScore(weakestDimension.average)}</span>.
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-[#4c4a7d]">Analyze calls to reveal the first coaching theme.</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe4ff] bg-white p-5 shadow-[0_12px_30px_rgba(9,0,68,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-[#090044]">Manager feedback</h2>
                <p className="mt-1 text-sm text-[#5a5886]">Real calls · Last 30 days</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {[
                ["Scorecards rated", data.feedback.reviewed_calls.toString()],
                ["Rated useful (4 or 5)", formatScore(data.feedback.helpful_percent)],
                ["Reported review time", data.feedback.average_review_seconds === null ? "-" : data.feedback.average_review_seconds + " sec"],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#4c4a7d]">{label as string}</span>
                  <span className="font-black text-[#090044]">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe4ff] bg-white shadow-[0_12px_30px_rgba(9,0,68,0.04)]">
            <div className="border-b border-[#dfe4ff] px-5 py-4">
              <h2 className="text-base font-black text-[#090044]">Needs attention</h2>
              <p className="text-sm text-[#5a5886]">Calls ready for review or recovery</p>
            </div>
            {needsReview.length === 0 ? (
              <p className="p-5 text-sm leading-6 text-[#5a5886]">No blocked or ready-to-analyze calls right now.</p>
            ) : (
              <div className="divide-y divide-[#eef1ff]">
                {needsReview.map((call) => (
                  <Link key={call.id} href={callHref(call.id)} className="block px-5 py-3 hover:bg-[#fbfcff]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-bold text-[#090044]">{call.lead_name || "Untitled call"}</p>
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
