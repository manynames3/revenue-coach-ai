import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, Target, ThumbsUp, Trash2 } from "lucide-react";
import ScoreCard from "../../components/ScoreCard";
import { useAuth } from "../../components/AuthContext";
import { Field, inputClass, Notice, primaryClass, secondaryClass } from "../../components/FormUI";
import { api, jsonBody, uploadAudio } from "../../lib/api";
import type { Call } from "../../types";

export default function CallDetail() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const { user } = useAuth();
  const [call, setCall] = useState<Call | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [skill, setSkill] = useState("");
  const [instructions, setInstructions] = useState("");
  const [due, setDue] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("");
  const [rating, setRating] = useState("");
  const [reviewSeconds, setReviewSeconds] = useState("");
  const [consentNotes, setConsentNotes] = useState("");
  const reload = useCallback(async () => {
    if (!id) return;
    const payload = await api<Call>("/calls/" + encodeURIComponent(id));
    setCall(payload);
  }, [id]);
  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    api<Call>("/calls/" + encodeURIComponent(id)).then((payload) => {
      if (cancelled) return;
      setCall(payload);
    }).catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [id]);
  useEffect(() => {
    if (!call?.analysis) return;
    const scored = Object.entries(call.analysis.scores || {}).filter(([, value]) => value !== null)
      .sort(([, a], [, b]) => Number(a) - Number(b));
    setSkill(scored[0]?.[0] || Object.keys(call.analysis.scores || {})[0] || "");
    setInstructions(call.analysis.coaching_drill || "");
    setDue(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    setRating(call.analysis.feedback_rating?.toString() || "");
    setReviewSeconds(call.analysis.review_seconds?.toString() || "");
  }, [call?.analysis?.id]);
  useEffect(() => {
    if (!call || !["analyzing", "transcribing"].includes(call.status)) return;
    let cancelled = false;
    let pending = false;
    const timer = window.setInterval(async () => {
      if (pending) return;
      pending = true;
      try { const payload = await api<Call>("/calls/" + encodeURIComponent(id)); if (!cancelled) setCall(payload); }
      catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : "Connection unavailable."); }
      finally { pending = false; }
    }, 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [call?.status, id]);
  async function analyze() {
    setBusy(true); setError("");
    try { await api("/calls/" + encodeURIComponent(id) + "/analyze", { method: "POST" }); await reload(); }
    catch (err) {
      setError(err instanceof Error ? err.message : "Scoring unavailable.");
      try { await reload(); } catch { /* Keep the original actionable scoring error. */ }
    }
    finally { setBusy(false); }
  }
  async function assign(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await api("/coaching", jsonBody({ call_id: id, skill, instructions, due_at: new Date(due + "T17:00:00").toISOString() }));
      setNotice("Practice assigned. The rep can submit an exercise in Practice Lab.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to assign practice."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!window.confirm("Delete this call, its scorecard, audio, and linked coaching assignments?")) return;
    setBusy(true); setError("");
    try { await api("/calls/" + encodeURIComponent(id), { method: "DELETE" }); await router.push("/dashboard"); }
    catch (err) { setError(err instanceof Error ? err.message : "Deletion could not finish."); setBusy(false); }
  }
  async function replaceAudio(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError("");
    try { await uploadAudio(id, file); await reload(); }
    catch (err) { setError(err instanceof Error ? err.message : "Upload failed."); }
    finally { setBusy(false); }
  }
  function selectEvidence(segmentId: string) {
    setSelectedSegment(segmentId);
    window.requestAnimationFrame(() => document.getElementById("segment-" + segmentId)?.scrollIntoView({ block: "center" }));
  }
  async function saveFeedback(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await api("/calls/" + encodeURIComponent(id) + "/feedback",
        jsonBody({ rating: Number(rating), review_seconds: reviewSeconds ? Number(reviewSeconds) : null }));
      await reload(); setNotice("Feedback saved. Sample feedback stays separate from real-call reporting.");
    } catch (err) { setError(err instanceof Error ? err.message : "Feedback could not be saved."); }
    finally { setBusy(false); }
  }
  async function recordConsent(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api("/calls/" + encodeURIComponent(id) + "/consent", jsonBody({ consent_confirmed: true, consent_notes: consentNotes }, "PATCH"));
      await reload(); setNotice("Permission recorded for this conversation.");
    } catch (err) { setError(err instanceof Error ? err.message : "Permission could not be recorded."); }
    finally { setBusy(false); }
  }
  if (!call) return <div className="mx-auto max-w-4xl"><Notice message={error} />{!error && <p role="status">Loading call...</p>}</div>;
  const processing = ["analyzing", "transcribing"].includes(call.status);
  return <div className="mx-auto max-w-7xl space-y-6">
    <Head><title>{(call.lead_name || "Call review") + " | RevenueCoach"}</title></Head>
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#5a5886]"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#dfe4ff] pb-5">
      <div><p className="text-xs font-semibold uppercase text-[#1684ff]">{call.is_sample ? "Illustrative sample" : call.status.replaceAll("_", " ")}</p>
        <h1 className="mt-2 text-3xl font-bold text-[#090044]">{call.lead_name || "Sales conversation"}</h1>
        <p className="mt-2 text-sm text-[#5a5886]">{call.call_type || "Call review"} · {new Date(call.created_at).toLocaleDateString()} · {call.consent_confirmed ? "Consent recorded" : "Consent not recorded"}</p>
      </div>
      <div className="flex gap-2">
        {call.transcript && !call.analysis && <button onClick={analyze} disabled={busy || processing} className={primaryClass}>
          {busy || processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{processing ? "Scoring queued" : "Analyze call"}</button>}
        {user?.role === "manager" && <button onClick={remove} disabled={busy} className={secondaryClass + " text-rose-700"} title="Delete call"><Trash2 className="h-4 w-4" />Delete</button>}
      </div>
    </header>
    <Notice message={error || call.failure_reason || ""} /><Notice message={notice} success />
    {!call.consent_confirmed && <form onSubmit={recordConsent} className="space-y-4 border-y border-[#dfe4ff] py-5">
      <Field label="Permission notes (optional)"><input maxLength={2000} className={inputClass} value={consentNotes} onChange={(e) => setConsentNotes(e.target.value)} /></Field>
      <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" required className="mt-1" />I have permission to upload and analyze this conversation.</label>
      <button disabled={busy} className={secondaryClass}>Record permission</button>
    </form>}
    {processing && <p role="status" className="flex items-center gap-2 text-sm text-[#5a5886]"><Loader2 className="h-4 w-4 animate-spin" />{call.status === "transcribing" ? "Transcription is in progress." : "Your scoring job is queued or processing."}</p>}
    {!call.transcript && !processing && <section className="border-y border-[#dfe4ff] py-6">
      <Field label="Upload or retry audio"><input type="file" accept="audio/*" disabled={busy} className={inputClass} onChange={(e) => replaceAudio(e.target.files?.[0])} /></Field>
      <p className="mt-2 text-xs text-[#5a5886]">MP3, M4A, WAV, or WebM, up to 100 MB.</p>
    </section>}
    {call.analysis && <ScoreCard analysis={call.analysis} onEvidenceSelect={selectEvidence} />}
    {user?.role === "manager" && call.analysis && call.analysis.source_mode !== "legacy" && <section className="border-y border-[#dfe4ff] py-6">
      <h2 className="flex items-center gap-2 text-lg font-bold"><ThumbsUp className="h-5 w-5 text-[#5c67ff]" />Was this useful for coaching?</h2>
      <form onSubmit={saveFeedback} className="mt-4 flex flex-wrap items-end gap-4">
        <Field label="Usefulness"><select required value={rating} onChange={(e) => setRating(e.target.value)} className={inputClass}>
          <option value="">Choose a rating</option><option value="1">1 - Not useful</option><option value="2">2 - Limited</option>
          <option value="3">3 - Somewhat useful</option><option value="4">4 - Useful</option><option value="5">5 - Very useful</option>
        </select></Field>
        <Field label="Your review time in seconds (optional)"><input type="number" min={1} max={3600} value={reviewSeconds} onChange={(e) => setReviewSeconds(e.target.value)} className={inputClass} /></Field>
        <button disabled={busy} className={secondaryClass}><ThumbsUp className="h-4 w-4" />Save feedback</button>
      </form>
    </section>}
    {user?.role === "manager" && call.analysis && call.analysis.source_mode !== "legacy" && <section className="border-y border-[#dfe4ff] py-6">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Target className="h-5 w-5 text-[#5c67ff]" />Assign focused practice</h2>
      <form onSubmit={assign} className="mt-4 grid gap-4 md:grid-cols-[1fr_200px]">
        <Field label="Skill"><select required className={inputClass} value={skill} onChange={(e) => setSkill(e.target.value)}>
          <option value="">Choose a skill</option>{Object.keys(call.analysis.scores || {}).map((key) => <option key={key} value={key}>{call.analysis?.rubric_snapshot?.score_categories.find((category) => category.key === key)?.label || key.replaceAll("_", " ")}</option>)}
        </select></Field>
        <Field label="Due date"><input type="date" required className={inputClass} value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        <div className="md:col-span-2"><Field label="Practice exercise"><textarea required minLength={20} maxLength={3000} rows={3} className={inputClass} value={instructions} onChange={(e) => setInstructions(e.target.value)} /></Field></div>
        <button disabled={busy} className={primaryClass + " w-fit"}>Assign practice</button><Link href="/practice" className="self-center text-sm font-semibold text-[#3d42ff]">View coaching queue</Link>
      </form>
    </section>}
    {call.transcript && <section className="border-t border-[#dfe4ff] pt-5" id="transcript">
      <h2 className="text-lg font-bold">Source transcript</h2>
      {call.transcript_segments?.length ? <div className="mt-4 divide-y divide-[#dfe4ff]">
        {call.transcript_segments.map((segment) => <div id={"segment-" + segment.id} key={segment.id} className={"grid gap-2 px-3 py-4 sm:grid-cols-[120px_1fr] " + (selectedSegment === segment.id ? "bg-[#eef1ff]" : "")}>
          <p className="text-xs font-semibold text-[#5a5886]">{segment.start_seconds !== null ? Math.floor(segment.start_seconds / 60).toString().padStart(2, "0") + ":" + Math.floor(segment.start_seconds % 60).toString().padStart(2, "0") : segment.id} · {segment.speaker}</p>
          <p className="text-sm leading-6 text-[#312f61]">{segment.text}</p>
        </div>)}
      </div> : <pre className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">{call.transcript}</pre>}
    </section>}
  </div>;
}
