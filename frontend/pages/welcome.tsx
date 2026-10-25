import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ArrowRight, FilePlus2, PlayCircle, Save } from "lucide-react";
import { useAuth } from "../components/AuthContext";
import { Field, inputClass, Notice, primaryClass, secondaryClass } from "../components/FormUI";
import { api, callHref, jsonBody } from "../lib/api";
import type { Account } from "../types";

export default function Welcome() {
  const { user } = useAuth();
  const router = useRouter();
  const [context, setContext] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [processingEnabled, setProcessingEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    api<Account>("/account").then((data) => { if (!cancelled) { setContext(data.offer_context); setProcessingEnabled(data.processing_enabled); } })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);
  async function sample() {
    setBusy(true); setError("");
    try {
      const result = await api<{ call_id: string }>("/onboarding/sample", jsonBody({}));
      await router.push(callHref(result.call_id));
    } catch (err) { setError(err instanceof Error ? err.message : "Sample unavailable."); }
    finally { setBusy(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setSaved(false);
    try { await api("/account", jsonBody({ offer_context: context }, "PATCH")); setSaved(true); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to save."); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-4xl space-y-8">
    <Head><title>Your first coaching review | RevenueCoach</title></Head>
    <div><p className="text-xs font-semibold uppercase text-[#1684ff]">Welcome, {user?.name}</p>
      <h1 className="mt-2 text-3xl font-bold text-[#090044]">Coach your first conversation</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5a5886]">Bring the offer, buyer, and business outcome into the review.</p></div>
    <Notice message={error} /><Notice success message={saved ? "Company context saved for future analyses." : ""} />
    {processingEnabled === false && <section className="flex flex-wrap items-center justify-between gap-4 border-y border-[#dfe4ff] py-5">
      <p className="max-w-xl text-sm leading-6 text-[#5a5886]">Your sample is ready. Real model and audio processing are enabled by an operator after pilot scope and payment are confirmed.</p>
      <Link href="/pilot" className={secondaryClass}>Request a pilot<ArrowRight className="h-4 w-4" /></Link>
    </section>}
    {user?.role === "manager" && <form onSubmit={save} className="grid gap-5 border-y border-[#dfe4ff] py-6 sm:grid-cols-2">
      {Object.entries({ offer: "What do you sell?", buyer: "Who buys it?", deal_value: "Typical deal value", success_metric: "What would a successful pilot improve?" }).map(([key, label]) =>
        <Field key={key} label={label}><textarea maxLength={2000} rows={3} className={inputClass} value={context[key] || ""} onChange={(e) => setContext({ ...context, [key]: e.target.value })} /></Field>)}
      <button disabled={busy} className={secondaryClass + " w-fit"}><Save className="h-4 w-4" />Save company context</button>
    </form>}
    <section className="grid gap-7 sm:grid-cols-2">
      <div><PlayCircle className="h-6 w-6 text-[#5c67ff]" /><h2 className="mt-3 text-lg font-bold">Review the sample</h2>
        <p className="mt-2 text-sm leading-6 text-[#5a5886]">An illustrative discovery call with predefined, source-verified coaching. No customer data or AI charge.</p>
        <button onClick={sample} disabled={busy} className={primaryClass + " mt-4"}>Open sample scorecard<ArrowRight className="h-4 w-4" /></button></div>
      <div><FilePlus2 className="h-6 w-6 text-[#5c67ff]" /><h2 className="mt-3 text-lg font-bold">Review your next call</h2>
        <p className="mt-2 text-sm leading-6 text-[#5a5886]">Upload an authorized transcript or audio recording. Real scoring requires an active model provider.</p>
        <Link href="/calls/new" className={secondaryClass + " mt-4"}>Add a conversation<ArrowRight className="h-4 w-4" /></Link></div>
    </section>
  </div>;
}
