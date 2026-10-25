import Head from "next/head";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { api, jsonBody } from "../lib/api";
import { Field, inputClass, Notice, primaryClass, PublicHeader } from "../components/FormUI";

type Offer = { days: number; price_usd: number | null; billing: string; support_email: string; includes: string[] };

export default function Pilot() {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [form, setForm] = useState({ name: "", email: "", company: "", team_size: 5, goal: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => { api<Offer>("/pilots/offer").then(setOffer).catch(() => setError("Pilot details are temporarily unavailable. Please retry shortly.")); }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { const result = await api<{ message: string }>("/pilots", jsonBody(form)); setConfirmation(result.message); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to record your request."); }
    finally { setBusy(false); }
  }
  return <><Head><title>Start a paid coaching pilot | RevenueCoach</title></Head><PublicHeader />
    <main className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-2">
      <div><p className="text-xs font-semibold uppercase text-[#1684ff]">30-day paid pilot</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight">RevenueCoach for your sales team</h1>
        <p className="mt-5 text-base leading-8 text-[#5a5886]">Find the call moments that need coaching, assign focused practice, and check the next conversation against the same rubric.</p>
        <p className="mt-6 text-xl font-bold">{offer?.price_usd !== null && offer?.price_usd !== undefined ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(offer.price_usd) + " per pilot" : "A team-specific quote before you commit"}</p>
        <p className="mt-2 text-sm leading-6 text-[#5a5886]">Scope and pricing are confirmed before an invoice. Submitting this form does not charge you or start a subscription.</p>
        <ul className="mt-6 space-y-3">{(offer?.includes || ["Team workspace and rubric setup", "Source-backed call scorecards", "Practice assignments and manager reviews", "End-of-pilot review"]).map((item) =>
          <li key={item} className="flex gap-3 text-sm leading-6"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />{item}</li>)}</ul>
        <p className="mt-6 text-sm leading-6 text-[#5a5886]">Best suited to managers coaching small teams selling high-ticket services. We agree on a measurable coaching goal at the start.</p>
      </div>
      <section className="rounded-lg border border-[#dfe4ff] bg-white p-6">
        <h2 className="text-xl font-bold">Request your pilot</h2><Notice message={error} />
        {confirmation ? <Notice success message={confirmation} /> : <form onSubmit={submit} className="mt-5 space-y-4">
          <Field label="Your name"><input required maxLength={100} className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Work email"><input required type="email" maxLength={254} className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Company"><input required maxLength={100} className={inputClass} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          <Field label="Number of reps"><input required type="number" min={1} max={500} className={inputClass} value={form.team_size} onChange={(e) => setForm({ ...form, team_size: Number(e.target.value) })} /></Field>
          <Field label="What do you need to improve?"><textarea required minLength={10} maxLength={2000} rows={4} className={inputClass} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></Field>
          <p className="text-xs leading-5 text-[#5a5886]">Your details will be used to discuss this request. Please keep customer transcripts and sensitive information out of this form.</p>
          <button disabled={busy || !offer} className={primaryClass + " w-full"}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}Request pilot</button>
        </form>}
      </section>
    </main></>;
}
