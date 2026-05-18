import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  Gauge,
  Mail,
  MessageSquareText,
  ShieldQuestion,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Call, DashboardOverview } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type RevenueMotion = {
  key: string;
  title: string;
  goal: string;
  scoreFocus: string;
  buyerSignal: string;
  drill: string;
  managerMove: string;
  icon: typeof BarChart3;
};

const revenueMotions: RevenueMotion[] = [
  {
    key: "discovery",
    title: "Discovery depth",
    goal: "Expose pain, business impact, and personal stakes before positioning the offer.",
    scoreFocus: "Discovery, problem clarity, emotional depth",
    buyerSignal: "The buyer explains what happens if nothing changes.",
    drill: "Run a five-question sequence that moves from surface issue to consequence to decision cost.",
    managerMove: "Review whether the rep earned the right to discuss price or next steps.",
    icon: MessageSquareText,
  },
  {
    key: "objection_handling",
    title: "Objection handling",
    goal: "Turn price, timing, and trust objections into better diagnosis instead of defensive replies.",
    scoreFocus: "Resistance management, money readiness, objection quality",
    buyerSignal: "The buyer clarifies the concern behind the stated objection.",
    drill: "Replay the objection and require two clarifying questions before any explanation.",
    managerMove: "Coach the rep on whether their response reduced or created resistance.",
    icon: ShieldQuestion,
  },
  {
    key: "closing",
    title: "Decision clarity",
    goal: "Identify who decides, what must be true, and what blocks commitment.",
    scoreFocus: "Closing, decision clarity, urgency",
    buyerSignal: "The buyer names the decision path, timing, and approval risk.",
    drill: "Practice asking for the decision process without sounding assumptive or pushy.",
    managerMove: "Confirm next step quality and whether the rep left with a real commitment.",
    icon: BadgeCheck,
  },
  {
    key: "follow_up",
    title: "Follow-up rescue",
    goal: "Convert call insight into a follow-up that anchors the buyer's stated pain and next action.",
    scoreFocus: "Follow-up, urgency, emotional driver",
    buyerSignal: "The message references the buyer's words and gives a clear next step.",
    drill: "Rewrite the SMS and email using the buyer's blocker, urgency, and desired outcome.",
    managerMove: "Check whether follow-up language is specific enough to revive stalled intent.",
    icon: Mail,
  },
  {
    key: "rapport",
    title: "Trust and contrast",
    goal: "Build safety without turning the call into a friendly but low-pressure conversation.",
    scoreFocus: "Rapport, trust and safety, consequence awareness",
    buyerSignal: "The buyer shares tradeoffs they would not tell a generic seller.",
    drill: "Practice permission-based questions that make the buyer feel understood before challenge.",
    managerMove: "Balance empathy with direct questions that advance the deal.",
    icon: Users,
  },
];

const questionDrills = [
  {
    title: "Problem clarity",
    prompt: "What made this worth looking at now instead of continuing the way things are?",
    coachingFocus: "Forces the buyer to compare current pain against status quo comfort.",
  },
  {
    title: "Consequence expansion",
    prompt: "If this stays unresolved for another quarter, what does it cost the team or business?",
    coachingFocus: "Moves the call from feature interest to measurable revenue impact.",
  },
  {
    title: "Money readiness",
    prompt: "When this problem is worth solving, how do you usually decide what investment makes sense?",
    coachingFocus: "Surfaces budget logic without turning the conversation into a discount exchange.",
  },
  {
    title: "Decision path",
    prompt: "Who else needs to feel confident before this can move forward?",
    coachingFocus: "Finds hidden stakeholders and prevents single-threaded deals.",
  },
  {
    title: "Resistance management",
    prompt: "What would make this feel like too much risk, even if the outcome is valuable?",
    coachingFocus: "Lets the buyer name the real blocker before the rep tries to handle it.",
  },
];

const coachingLoop = [
  { title: "Analyze", detail: "Score a real call or transcript.", icon: BarChart3 },
  { title: "Diagnose", detail: "Find the revenue leak by skill and buyer signal.", icon: Gauge },
  { title: "Practice", detail: "Run a focused drill before the next live conversation.", icon: Target },
  { title: "Verify", detail: "Compare the next scorecard against the same rubric.", icon: ClipboardCheck },
];

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(value)}%`;
}

function formatDimension(value: string) {
  return value.replace(/_/g, " ");
}

function statusClass(status: Call["status"]) {
  if (status === "analyzed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "failed") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "analyzing" || status === "transcribing") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "transcribed") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function motionForDimension(key: string | null) {
  if (!key) return revenueMotions[0];
  return revenueMotions.find((motion) => motion.key === key) || revenueMotions[0];
}

function Stat({
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

export default function PracticeLab() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [overviewResponse, callsResponse] = await Promise.all([
          fetch(`${API_URL}/dashboard/overview`),
          fetch(`${API_URL}/calls`),
        ]);
        if (!overviewResponse.ok || !callsResponse.ok) throw new Error("Practice data is unavailable.");
        const [overviewData, callRows] = await Promise.all([overviewResponse.json(), callsResponse.json()]);
        if (!cancelled) {
          setOverview(overviewData);
          setCalls(callRows);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load practice data.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const weakestDimension = useMemo(() => {
    if (!overview?.recent_scores.length) return null;

    const totals: Record<string, { total: number; count: number }> = {};
    overview.recent_scores.forEach((score) => {
      Object.entries(score.scores || {}).forEach(([key, value]) => {
        totals[key] = totals[key] || { total: 0, count: 0 };
        totals[key].total += value;
        totals[key].count += 1;
      });
    });

    return Object.entries(totals)
      .map(([key, value]) => ({ key, average: value.count ? value.total / value.count : 0 }))
      .sort((a, b) => a.average - b.average)[0];
  }, [overview]);

  const recommendedMotion = motionForDimension(weakestDimension?.key || null);
  const analyzedCalls = calls.filter((call) => call.status === "analyzed").slice(0, 4);
  const readyToScore = calls.filter((call) => call.status === "transcribed" || call.status === "failed").slice(0, 3);
  const activeCalls = calls.filter((call) => call.status === "transcribing" || call.status === "analyzing").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase text-blue-700">Revenue enablement</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Practice lab</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Convert call scorecards into focused drills for high-stakes sales conversations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/calls/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
          >
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            Add call
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" aria-hidden="true" />
            <p className="text-sm font-medium text-amber-800">{error}</p>
          </div>
        </div>
      )}

      <section className="rounded-lg bg-slate-950 p-5 text-white">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase text-blue-200">Recommended next drill</p>
            <h2 className="mt-2 text-2xl font-black">{recommendedMotion.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">{recommendedMotion.goal}</p>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Score focus</p>
                <p className="mt-1 text-sm font-bold text-white">{recommendedMotion.scoreFocus}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Buyer signal</p>
                <p className="mt-1 text-sm font-bold text-white">{recommendedMotion.buyerSignal}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Manager move</p>
                <p className="mt-1 text-sm font-bold text-white">{recommendedMotion.managerMove}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-black uppercase text-slate-300">Current coaching signal</p>
            {weakestDimension ? (
              <>
                <p className="mt-2 text-4xl font-black">{formatScore(weakestDimension.average)}</p>
                <p className="mt-1 text-sm font-bold capitalize text-slate-200">{formatDimension(weakestDimension.key)}</p>
              </>
            ) : (
              <>
                <p className="mt-2 text-4xl font-black">-</p>
                <p className="mt-1 text-sm font-bold text-slate-200">Analyze calls to personalize this drill.</p>
              </>
            )}
            <p className="mt-4 text-sm leading-6 text-slate-300">{recommendedMotion.drill}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Reviewed"
          value={overview?.analyzed_calls ?? "-"}
          detail="Scorecards available for coaching"
          icon={CheckCircle2}
        />
        <Stat label="Avg score" value={formatScore(overview?.average_score)} detail="Across analyzed calls" icon={TrendingUp} />
        <Stat label="Active" value={activeCalls} detail="Calls currently processing" icon={Brain} />
        <Stat label="Ready" value={readyToScore.length} detail="Calls ready for review or recovery" icon={Target} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-base font-black text-slate-950">Revenue motions</h2>
            <p className="text-sm text-slate-500">Use the scorecard rubric to coach moments that move pipeline.</p>
          </div>
          <Link href="/calls/new" className="inline-flex items-center gap-1 text-sm font-bold text-blue-700">
            Capture another call
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2 xl:grid-cols-3">
          {revenueMotions.map((motion) => {
            const Icon = motion.icon;
            return (
              <div key={motion.key} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-4 flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-black text-slate-950">{motion.title}</h3>
                    <p className="mt-1 text-xs font-black uppercase text-slate-400">{motion.scoreFocus}</p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-600">{motion.goal}</p>
                <div className="mt-4 rounded-md bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase text-slate-500">Drill</p>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-700">{motion.drill}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-black text-slate-950">Question-led drills</h2>
            <p className="text-sm text-slate-500">Prompts for high-ticket discovery, urgency, money, and decision clarity.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {questionDrills.map((drill) => (
              <div key={drill.title} className="grid gap-3 px-5 py-4 md:grid-cols-[180px_1fr]">
                <div>
                  <p className="text-sm font-black text-slate-950">{drill.title}</p>
                  <p className="mt-1 text-xs font-black uppercase text-blue-700">Practice prompt</p>
                </div>
                <div>
                  <p className="text-base font-black leading-7 text-slate-950">"{drill.prompt}"</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{drill.coachingFocus}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-black text-slate-950">Coaching loop</h2>
              <p className="text-sm text-slate-500">Continuous improvement without manager-heavy roleplays.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {coachingLoop.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="flex gap-3 px-5 py-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        {index + 1}. {step.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{step.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-black text-slate-950">Recent scorecards</h2>
              <p className="text-sm text-slate-500">Open a call before assigning the next drill.</p>
            </div>
            {analyzedCalls.length === 0 ? (
              <p className="p-5 text-sm leading-6 text-slate-500">No analyzed calls yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {analyzedCalls.map((call) => (
                  <Link key={call.id} href={`/calls/${call.id}`} className="block px-5 py-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-bold text-slate-950">{call.lead_name || "Untitled call"}</p>
                      <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-bold ${statusClass(call.status)}`}>
                        {call.status}
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
