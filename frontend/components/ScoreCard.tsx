import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle2,
  Clipboard,
  FileText,
  Mail,
  MessageSquareText,
  ShieldQuestion,
  Target,
} from "lucide-react";
import type { Analysis, SalesPsychology } from "../types";

type TabKey = "overview" | "evidence" | "psychology" | "objections" | "followup";

const tabs: Array<{ key: TabKey; label: string; icon: typeof BarChart3 }> = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "evidence", label: "Evidence", icon: FileText },
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
    <div className="rounded-md border border-[#dfe4ff] bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="truncate text-xs font-black uppercase text-[#5a5886]">{formatLabel(label)}</span>
        <span className="text-sm font-black text-[#090044]">{formatScore(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-[#eef1ff]">
        <div className={`h-full ${scoreColor(value)}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
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
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#eef1ff] text-[#4c4a7d]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        {eyebrow && <p className="text-xs font-black uppercase text-blue-700">{eyebrow}</p>}
        <h3 className="text-lg font-black text-[#090044]">{title}</h3>
      </div>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#cbd2f7] bg-white p-6 text-sm text-[#5a5886]">{text}</div>
  );
}

function PsychologySummary({ psychology }: { psychology: SalesPsychology }) {
  return <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
    <div className="border-l-2 border-[#5c67ff] pl-4">
      <p className="text-xs font-semibold uppercase text-[#1684ff]">Buyer concern to explore</p>
      <p className="mt-2 text-sm leading-7 text-[#312f61]">{psychology.primary_blocker || "No supported buyer concern was identified."}</p>
    </div>
    <div className="border-l-2 border-[#5c67ff] pl-4">
      <p className="text-xs font-semibold uppercase text-[#1684ff]">Next conversation</p>
      <p className="mt-2 text-sm leading-7 text-[#312f61]">{psychology.next_call_strategy || "Review the source evidence with your manager."}</p>
    </div>
  </div>;
}

function PsychologyTab({ psychology }: { psychology?: SalesPsychology | null }) {
  if (!psychology) {
    return <EmptyPanel text="This analysis was created before the sales psychology rubric was added." />;
  }

  return (
    <div className="space-y-6">
      <PsychologySummary psychology={psychology} />

      {psychology.better_questions.length > 0 && (
        <section className="rounded-lg border border-[#dfe4ff] bg-white p-5">
          <SectionHeader title="Better questions to ask" eyebrow="Coaching plan" icon={MessageSquareText} />
          <div className="space-y-3">
            {psychology.better_questions.map((question, index) => (
              <div key={index} className="rounded-lg border border-[#dfe4ff] p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[#090044] px-2 py-1 text-[10px] font-black uppercase text-white">
                    {question.category}
                  </span>
                  <span className="text-xs font-medium text-[#5a5886]">{question.missed_moment}</span>
                </div>
                <p className="text-base font-black leading-6 text-[#090044]">"{question.suggested_question}"</p>
                <p className="mt-2 text-sm leading-6 text-[#5a5886]">{question.why_it_works}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {psychology.next_call_strategy && (
        <section className="rounded-lg bg-[#090044] p-5 text-white">
          <p className="text-xs font-black uppercase text-blue-200">Next-call strategy</p>
          <p className="mt-2 text-sm leading-6 text-[#f6f8ff]">{psychology.next_call_strategy}</p>
        </section>
      )}
    </div>
  );
}

export default function ScoreCard({ analysis, onEvidenceSelect }: { analysis: Analysis; onEvidenceSelect?: (segmentId: string) => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const sortedScores = useMemo(() => Object.entries(analysis.scores || {}), [analysis.scores]);
  const score = analysis.overall_score ?? 0;

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-[#5a5886]">
        {analysis.source_mode === "sample" ? "Illustrative sample with predefined coaching. Not a real AI analysis." :
          analysis.source_mode === "legacy" ? "Historical scorecard · Not source-verified. Source evidence was not verified when it was created." :
          "Quotes verified against the source transcript. Coaching interpretations still require human review."}
        {analysis.rubric_snapshot && <> Rubric: {analysis.rubric_snapshot.name}, version {analysis.rubric_snapshot.version}.</>}
        {analysis.evidence_coverage !== null && analysis.evidence_coverage !== undefined && <> Observed rubric weight: {analysis.evidence_coverage}%.</>}
      </p>
      <section className="rounded-lg border border-[#dfe4ff] bg-white">
        <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
          <div className="border-b border-[#dfe4ff] bg-[#090044] p-6 text-white lg:border-b-0 lg:border-r">
            <p className="text-xs font-black uppercase text-blue-200">Performance score</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-6xl font-black">{analysis.overall_score ?? "-"}</span>
              <span className="pb-2 text-sm font-bold text-[#dfe4ff]">/ 100</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded bg-white/15">
              <div className={`h-full ${scoreColor(score)}`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">Executive summary</p>
                <p className="mt-2 max-w-3xl text-base font-medium leading-7 text-[#4c4a7d]">
                  {analysis.summary || "No summary returned for this call."}
                </p>
              </div>
              {analysis.rubric_snapshot && (
                <div className="shrink-0 rounded-lg border border-[#dfe4ff] bg-[#fbfcff] p-3">
                  <p className="text-[10px] font-black uppercase text-[#8c8ab3]">Observed coverage</p>
                  <p className="mt-1 text-lg font-black capitalize text-[#090044]">
                    {analysis.evidence_coverage ?? 0}%
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto rounded-lg border border-[#dfe4ff] bg-white p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-black transition-colors ${
                active ? "bg-[#090044] text-white" : "text-[#5a5886] hover:bg-[#eef1ff] hover:text-[#090044]"
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
          <section className="rounded-lg border border-[#dfe4ff] bg-white p-5">
            <SectionHeader title="Team rubric" icon={BarChart3} />
            <div className="space-y-3">
              {sortedScores.length > 0 ? (
                sortedScores.map(([key, value]) => <div key={key}>
                  {value === null ? <p className="text-sm font-semibold text-[#5a5886]">{formatLabel(key)}: not observed</p> :
                    <ScoreBar label={analysis.rubric_snapshot?.score_categories.find((category) => category.key === key)?.label || key} value={value} />}
                  {analysis.score_reasons?.[key] && <p className="mt-2 text-xs leading-5 text-[#5a5886]">{analysis.score_reasons[key]}</p>}
                </div>)
              ) : (
                <EmptyPanel text="No metric breakdown returned." />
              )}
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe4ff] bg-white p-5 xl:col-span-2">
            <SectionHeader title="Coaching notes" icon={Target} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-black uppercase text-emerald-700">What worked</p>
                <ul className="space-y-2">
                  {analysis.strengths.map((item, index) => (
                    <li key={index} className="flex gap-2 text-sm leading-6 text-[#4c4a7d]">
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
                    <li key={index} className="flex gap-2 text-sm leading-6 text-[#4c4a7d]">
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

      {activeTab === "evidence" && (
        <section className="rounded-lg border border-[#dfe4ff] bg-white p-5">
          <SectionHeader title="Transcript evidence" eyebrow="Supporting source excerpts" icon={FileText} />
          {analysis.evidence?.length ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {analysis.evidence.map((item, index) => (
                <div key={`${item.quote}-${index}`} className="rounded-lg border border-[#dfe4ff] bg-[#fbfcff] p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[#090044] px-2 py-1 text-[10px] font-black uppercase text-white">
                      {formatLabel(item.category || "evidence")}
                    </span>
                    {item.score_area && (
                      <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-black uppercase text-blue-700">
                        {formatLabel(item.score_area)}
                      </span>
                    )}
                    {item.timestamp && <span className="text-xs font-bold text-[#5a5886]">{item.timestamp}</span>}
                  </div>
                  {item.quote ? (
                    <blockquote className="border-l-4 border-blue-300 pl-3 text-sm font-bold leading-6 text-[#090044]">
                      "{item.quote}"
                    </blockquote>
                  ) : (
                    <p className="text-sm font-bold text-[#5a5886]">No exact quote returned.</p>
                  )}
                  <p className="mt-3 text-xs font-black uppercase text-[#8c8ab3]">{item.speaker || "unknown speaker"}</p>
                  <p className="mt-2 text-sm leading-6 text-[#5a5886]">{item.coaching_point}</p>
                  {item.segment_id && onEvidenceSelect && <button onClick={() => onEvidenceSelect(item.segment_id)} className="mt-3 text-sm font-semibold text-[#3d42ff]">View source excerpt</button>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel text="Evidence-backed excerpts will appear for newly generated scorecards." />
          )}
        </section>
      )}

      {activeTab === "psychology" && <PsychologyTab psychology={analysis.sales_psychology} />}

      {activeTab === "objections" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="rounded-lg border border-[#dfe4ff] bg-white p-5">
            <SectionHeader title="Objections handled" icon={ShieldQuestion} />
            {analysis.objections.length === 0 ? (
              <EmptyPanel text="No explicit objections detected." />
            ) : (
              <div className="space-y-3">
                {analysis.objections.map((objection, index) => (
                  <div key={index} className="rounded-lg border border-[#dfe4ff] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-black uppercase text-rose-700">
                        {objection.type}
                      </span>
                      <span className="text-xs font-black uppercase text-[#5a5886]">{objection.rep_response_quality}</span>
                    </div>
                    <p className="text-sm font-black text-[#090044]">"{objection.customer_quote}"</p>
                    <p className="mt-3 text-sm leading-6 text-[#5a5886]">{objection.better_response}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-[#dfe4ff] bg-white p-5">
            <SectionHeader title="Underlying concerns" icon={Brain} />
            {analysis.sales_psychology?.objection_psychology?.length ? (
              <div className="space-y-3">
                {analysis.sales_psychology.objection_psychology.map((objection, index) => (
                  <div key={index} className="rounded-lg border border-[#dfe4ff] p-4">
                    <span className="rounded-md bg-[#eef1ff] px-2 py-1 text-[10px] font-black uppercase text-[#4c4a7d]">
                      {formatLabel(objection.objection_type)}
                    </span>
                    <p className="mt-3 text-sm font-black text-[#090044]">"{objection.buyer_language}"</p>
                    <p className="mt-2 text-sm leading-6 text-[#5a5886]">{objection.underlying_concern}</p>
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
          <section className="rounded-lg border border-[#dfe4ff] bg-white p-5">
            <SectionHeader title="Follow-up SMS" icon={MessageSquareText} />
            {analysis.follow_up_sms ? (
              <>
                <div className="rounded-lg border border-[#dfe4ff] bg-[#fbfcff] p-4 text-sm leading-6 text-[#4c4a7d]">
                  {analysis.follow_up_sms}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(analysis.follow_up_sms || "")}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-[#4c4a7d] hover:bg-[#fbfcff]"
                >
                  <Clipboard className="h-4 w-4" aria-hidden="true" />
                  Copy SMS
                </button>
              </>
            ) : (
              <EmptyPanel text="No SMS draft returned." />
            )}
          </section>

          <section className="rounded-lg border border-[#dfe4ff] bg-white p-5">
            <SectionHeader title="Follow-up email" icon={Mail} />
            {analysis.follow_up_email ? (
              <>
                <p className="text-xs font-black uppercase text-[#5a5886]">Subject</p>
                <p className="mt-1 text-sm font-black text-[#090044]">{analysis.follow_up_email.subject}</p>
                <div className="mt-4 whitespace-pre-wrap rounded-lg border border-[#dfe4ff] bg-[#fbfcff] p-4 text-sm leading-6 text-[#4c4a7d]">
                  {analysis.follow_up_email.body}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(analysis.follow_up_email?.body || "")}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-[#4c4a7d] hover:bg-[#fbfcff]"
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
