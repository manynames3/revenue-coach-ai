import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle2,
  Clipboard,
  Mail,
  MessageSquareText,
  ShieldQuestion,
  Target,
} from "lucide-react";
import type { Analysis, SalesPsychology } from "../types";

type TabKey = "overview" | "psychology" | "objections" | "followup";

const tabs: Array<{ key: TabKey; label: string; icon: typeof BarChart3 }> = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "psychology", label: "Psychology", icon: Brain },
  { key: "objections", label: "Objections", icon: ShieldQuestion },
  { key: "followup", label: "Follow-up", icon: Mail },
];

function formatLabel(label: string) {
  return label.replace(/_/g, " ");
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(value)}%`;
}

function scoreColor(value: number) {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="truncate text-xs font-black uppercase text-slate-500">{formatLabel(label)}</span>
        <span className="text-sm font-black text-slate-950">{formatScore(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-slate-100">
        <div className={`h-full ${scoreColor(value)}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function LevelPill({ label, value }: { label: string; value: string }) {
  const normalized = value.toLowerCase();
  const color =
    normalized.includes("low") || normalized.includes("surface") || normalized.includes("unclear")
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : normalized.includes("high") || normalized.includes("deep") || normalized === "clear"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div>
      <p className="mb-1 text-[10px] font-black uppercase text-slate-400">{label}</p>
      <span className={`inline-flex max-w-full rounded-md border px-2 py-1 text-xs font-black uppercase ${color}`}>
        {value || "unknown"}
      </span>
    </div>
  );
}

function SectionHeader({
  title,
  eyebrow,
  icon: Icon,
}: {
  title: string;
  eyebrow?: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        {eyebrow && <p className="text-xs font-black uppercase text-blue-700">{eyebrow}</p>}
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
      </div>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">{text}</div>
  );
}

function PsychologySummary({ psychology }: { psychology: SalesPsychology }) {
  const scoreEntries = Object.entries(psychology.scores || {});

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <LevelPill label="Trust" value={psychology.trust_level} />
        <LevelPill label="Pain" value={psychology.pain_depth} />
        <LevelPill label="Urgency" value={psychology.urgency_level} />
        <LevelPill label="Close odds" value={psychology.close_probability} />
        <LevelPill label="Decision" value={psychology.decision_clarity} />
        <LevelPill label="Money" value={psychology.money_readiness} />
        <LevelPill label="Resistance" value={psychology.resistance_created} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-black uppercase text-blue-700">Emotional driver</p>
          <p className="mt-2 text-sm leading-6 text-blue-950">
            {psychology.emotional_driver || "Not enough buyer signal in the transcript."}
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase text-amber-700">Primary blocker</p>
          <p className="mt-2 text-sm leading-6 text-amber-950">{psychology.primary_blocker || "No clear blocker detected."}</p>
        </div>
      </div>

      {scoreEntries.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {scoreEntries.map(([key, value]) => (
            <ScoreBar key={key} label={key} value={value ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function PsychologyTab({ psychology }: { psychology?: SalesPsychology | null }) {
  if (!psychology) {
    return <EmptyPanel text="This analysis was created before the sales psychology rubric was added." />;
  }

  return (
    <div className="space-y-6">
      <PsychologySummary psychology={psychology} />

      {psychology.better_questions.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <SectionHeader title="Better questions to ask" eyebrow="Coaching plan" icon={MessageSquareText} />
          <div className="space-y-3">
            {psychology.better_questions.map((question, index) => (
              <div key={index} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-950 px-2 py-1 text-[10px] font-black uppercase text-white">
                    {question.category}
                  </span>
                  <span className="text-xs font-medium text-slate-500">{question.missed_moment}</span>
                </div>
                <p className="text-base font-black leading-6 text-slate-950">"{question.suggested_question}"</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{question.why_it_works}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {psychology.next_call_strategy && (
        <section className="rounded-lg bg-slate-950 p-5 text-white">
          <p className="text-xs font-black uppercase text-blue-200">Next-call strategy</p>
          <p className="mt-2 text-sm leading-6 text-slate-100">{psychology.next_call_strategy}</p>
        </section>
      )}
    </div>
  );
}

export default function ScoreCard({ analysis }: { analysis: Analysis }) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const sortedScores = useMemo(() => Object.entries(analysis.scores || {}), [analysis.scores]);
  const score = analysis.overall_score ?? 0;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
          <div className="border-b border-slate-200 bg-slate-950 p-6 text-white lg:border-b-0 lg:border-r">
            <p className="text-xs font-black uppercase text-blue-200">Performance score</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-6xl font-black">{analysis.overall_score ?? "-"}</span>
              <span className="pb-2 text-sm font-bold text-slate-300">/ 100</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded bg-white/15">
              <div className={`h-full ${scoreColor(score)}`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">Executive summary</p>
                <p className="mt-2 max-w-3xl text-base font-medium leading-7 text-slate-700">
                  {analysis.summary || "No summary returned for this call."}
                </p>
              </div>
              {analysis.sales_psychology && (
                <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase text-slate-400">Close odds</p>
                  <p className="mt-1 text-lg font-black capitalize text-slate-950">
                    {analysis.sales_psychology.close_probability || "unknown"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-black transition-colors ${
                active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <SectionHeader title="Core sales metrics" icon={BarChart3} />
            <div className="space-y-3">
              {sortedScores.length > 0 ? (
                sortedScores.map(([key, value]) => <ScoreBar key={key} label={key} value={value ?? 0} />)
              ) : (
                <EmptyPanel text="No metric breakdown returned." />
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 xl:col-span-2">
            <SectionHeader title="Coaching notes" icon={Target} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-black uppercase text-emerald-700">What worked</p>
                <ul className="space-y-2">
                  {analysis.strengths.map((item, index) => (
                    <li key={index} className="flex gap-2 text-sm leading-6 text-slate-700">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-3 text-xs font-black uppercase text-amber-700">Improve next</p>
                <ul className="space-y-2">
                  {analysis.missed_opportunities.map((item, index) => (
                    <li key={index} className="flex gap-2 text-sm leading-6 text-slate-700">
                      <AlertCircle className="mt-1 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {analysis.coaching_drill && (
              <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-black uppercase text-blue-700">Suggested drill</p>
                <p className="mt-2 text-sm leading-6 text-blue-950">{analysis.coaching_drill}</p>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === "psychology" && <PsychologyTab psychology={analysis.sales_psychology} />}

      {activeTab === "objections" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <SectionHeader title="Objections handled" icon={ShieldQuestion} />
            {analysis.objections.length === 0 ? (
              <EmptyPanel text="No explicit objections detected." />
            ) : (
              <div className="space-y-3">
                {analysis.objections.map((objection, index) => (
                  <div key={index} className="rounded-lg border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-black uppercase text-rose-700">
                        {objection.type}
                      </span>
                      <span className="text-xs font-black uppercase text-slate-500">{objection.rep_response_quality}</span>
                    </div>
                    <p className="text-sm font-black text-slate-950">"{objection.customer_quote}"</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{objection.better_response}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <SectionHeader title="Underlying concerns" icon={Brain} />
            {analysis.sales_psychology?.objection_psychology?.length ? (
              <div className="space-y-3">
                {analysis.sales_psychology.objection_psychology.map((objection, index) => (
                  <div key={index} className="rounded-lg border border-slate-200 p-4">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-700">
                      {formatLabel(objection.objection_type)}
                    </span>
                    <p className="mt-3 text-sm font-black text-slate-950">"{objection.buyer_language}"</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{objection.underlying_concern}</p>
                    <p className="mt-3 text-sm font-bold leading-6 text-blue-700">{objection.recommended_question}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel text="No objection psychology returned for this scorecard." />
            )}
          </section>
        </div>
      )}

      {activeTab === "followup" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <SectionHeader title="Follow-up SMS" icon={MessageSquareText} />
            {analysis.follow_up_sms ? (
              <>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {analysis.follow_up_sms}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(analysis.follow_up_sms || "")}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Clipboard className="h-4 w-4" aria-hidden="true" />
                  Copy SMS
                </button>
              </>
            ) : (
              <EmptyPanel text="No SMS draft returned." />
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <SectionHeader title="Follow-up email" icon={Mail} />
            {analysis.follow_up_email ? (
              <>
                <p className="text-xs font-black uppercase text-slate-500">Subject</p>
                <p className="mt-1 text-sm font-black text-slate-950">{analysis.follow_up_email.subject}</p>
                <div className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {analysis.follow_up_email.body}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(analysis.follow_up_email?.body || "")}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Clipboard className="h-4 w-4" aria-hidden="true" />
                  Copy email
                </button>
              </>
            ) : (
              <EmptyPanel text="No email draft returned." />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
