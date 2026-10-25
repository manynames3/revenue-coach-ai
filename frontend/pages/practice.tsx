import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardCheck, RefreshCw, Target } from "lucide-react";
import { useAuth } from "../components/AuthContext";
import { Field, inputClass, Notice, primaryClass, secondaryClass } from "../components/FormUI";
import { api, callHref, jsonBody } from "../lib/api";
import type { Call, CoachingAssignment } from "../types";

export default function PracticeLab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CoachingAssignment[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("all");
  const [response, setResponse] = useState("");
  const [feedback, setFeedback] = useState("");
  const [verification, setVerification] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const selected = rows.find((row) => row.id === selectedId);
  const filtered = useMemo(() => rows.filter((row) => filter === "all" || row.state === filter), [rows, filter]);
  async function load() {
    setError(""); setLoading(true);
    try {
      const [assignments, conversations] = await Promise.all([api<CoachingAssignment[]>("/coaching"), api<Call[]>("/calls?limit=200")]);
      setRows(assignments); setCalls(conversations);
    } catch (err) { setError(err instanceof Error ? err.message : "Coaching queue unavailable."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  function select(row: CoachingAssignment) {
    setSelectedId(row.id); setResponse(row.practice_response || "");
    setFeedback(row.feedback || ""); setVerification(row.verification_call_id || "");
    setNotice(""); setError("");
  }
  async function submit(event: React.FormEvent, action: "complete" | "review") {
    event.preventDefault();
    if (!selected) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await api<CoachingAssignment>("/coaching/" + selected.id + "/" + action,
        jsonBody(action === "complete" ? { response } : { feedback, verification_call_id: verification || null }));
      setRows((items) => items.map((item) => item.id === result.id ? result : item));
      setNotice(action === "complete" ? "Practice submitted for manager review." : "Review saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save practice."); }
    finally { setBusy(false); }
  }
  const candidates = calls.filter((call) => selected && call.rep_id === selected.rep_id && call.id !== selected.call_id && call.status === "analyzed");
  return <div className="mx-auto max-w-7xl space-y-6">
    <Head><title>Practice Lab | RevenueCoach</title></Head>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase text-[#1684ff]">Practice Lab</p>
        <h1 className="mt-2 text-3xl font-bold text-[#090044]">{user?.role === "manager" ? "Your coaching queue" : "Your assigned practice"}</h1>
        <p className="mt-2 text-sm text-[#5a5886]">One skill, one exercise, and a reviewed next step.</p></div>
      <button className={secondaryClass} onClick={load} disabled={busy || loading}><RefreshCw className="h-4 w-4" />Refresh</button>
    </header>
    <Notice message={error} /><Notice message={notice} success />
    <div className="grid gap-4 sm:grid-cols-3">
      {[["Assigned", rows.filter((row) => row.state === "assigned").length], ["Awaiting review", rows.filter((row) => row.state === "completed").length], ["Reviewed", rows.filter((row) => row.state === "reviewed").length]].map(([label, value]) =>
        <div key={label} className="border-b border-[#dfe4ff] py-4"><p className="text-xs font-semibold uppercase text-[#5a5886]">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}
    </div>
    <nav aria-label="Assignment status" className="flex flex-wrap gap-2">
      {[["all", "All"], ["assigned", "Assigned"], ["completed", "Awaiting review"], ["reviewed", "Reviewed"]].map(([key, label]) =>
        <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)} className={filter === key ? primaryClass : secondaryClass}>{label}</button>)}
    </nav>
    {loading ? <p role="status">Loading assignments...</p> : rows.length === 0 ? <section className="border-y border-[#dfe4ff] py-10">
      <Target className="h-7 w-7 text-[#5c67ff]" /><h2 className="mt-3 text-lg font-bold">No practice assigned yet</h2>
      <p className="mt-2 text-sm text-[#5a5886]">{user?.role === "manager" ? "Choose a coaching moment from a verified scorecard and assign a focused exercise." : "Your manager can assign an exercise from one of your call scorecards."}</p>
      <Link href="/dashboard" className={secondaryClass + " mt-4"}>Review scorecards<ArrowRight className="h-4 w-4" /></Link>
    </section> : <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="divide-y divide-[#dfe4ff]">
        {filtered.length === 0 && <p className="py-6 text-sm text-[#5a5886]">No assignments in this state.</p>}
        {filtered.map((row) => <button key={row.id} onClick={() => select(row)} aria-pressed={selectedId === row.id}
          className={"block w-full px-3 py-4 text-left " + (selectedId === row.id ? "bg-[#eef1ff]" : "hover:bg-white")}>
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-bold">{row.rep_name}</span><span className="text-xs font-semibold capitalize text-[#5a5886]">{row.state}</span></div>
          <p className="mt-2 text-sm capitalize">{row.skill.replaceAll("_", " ")}</p>
          <p className="mt-1 text-xs text-[#5a5886]">Due {new Date(row.due_at).toLocaleDateString()}</p>
          {row.verified_score !== null && row.baseline_score !== null && <p className="mt-2 text-xs font-semibold text-[#3d42ff]">Verified skill: {row.baseline_score} → {row.verified_score}/100</p>}
        </button>)}
      </div>
      {selected ? <section className="space-y-5 rounded-lg border border-[#dfe4ff] bg-white p-5">
        <div><p className="text-xs font-semibold uppercase text-[#1684ff]">{selected.rep_name}</p><h2 className="mt-2 text-xl font-bold capitalize">{selected.skill.replaceAll("_", " ")}</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#312f61]">{selected.instructions}</p>
          <Link href={callHref(selected.call_id)} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#3d42ff]">Review the source call<ArrowRight className="h-4 w-4" /></Link></div>
        {selected.state === "assigned" ? <form onSubmit={(event) => submit(event, "complete")} className="space-y-4">
          <Field label="Your practiced response"><textarea required minLength={20} maxLength={5000} rows={6} className={inputClass} value={response} onChange={(e) => setResponse(e.target.value)} /></Field>
          <button disabled={busy} className={primaryClass}><CheckCircle2 className="h-4 w-4" />{user?.role === "manager" ? "Record practice completion" : "Submit practice"}</button>
        </form> : <div><h3 className="text-sm font-semibold">Submitted practice</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#5a5886]">{selected.practice_response}</p></div>}
        {selected.state !== "assigned" && user?.role === "manager" && <form onSubmit={(event) => submit(event, "review")} className="space-y-4 border-t border-[#dfe4ff] pt-5">
          <Field label="Manager feedback"><textarea required minLength={10} maxLength={3000} rows={4} className={inputClass} value={feedback} onChange={(e) => setFeedback(e.target.value)} /></Field>
          <Field label="Verify against a later call (optional)"><select className={inputClass} value={verification} onChange={(e) => setVerification(e.target.value)}>
            <option value="">Review practice without a call comparison</option>{candidates.map((call) => <option key={call.id} value={call.id}>{call.lead_name || "Untitled call"} · {new Date(call.created_at).toLocaleDateString()}</option>)}
          </select></Field>
          <p className="text-xs leading-5 text-[#5a5886]">A comparison requires the same rep, rubric version, and sample/real mode. It measures a skill score change, not revenue causation.</p>
          <button disabled={busy} className={primaryClass}><ClipboardCheck className="h-4 w-4" />Save manager review</button>
        </form>}
        {selected.feedback && <div className="border-t border-[#dfe4ff] pt-4"><h3 className="text-sm font-semibold">Latest feedback</h3><p className="mt-2 text-sm leading-7 text-[#5a5886]">{selected.feedback}</p></div>}
        {selected.verification_call_id && <Link href={callHref(selected.verification_call_id)} className="text-sm font-semibold text-[#3d42ff]">View verification call</Link>}
      </section> : <p className="py-6 text-sm text-[#5a5886]">Select an assignment to review the exercise.</p>}
    </div>}
  </div>;
}
