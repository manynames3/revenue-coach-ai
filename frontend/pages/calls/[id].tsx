import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Clipboard,
  Clock3,
  RefreshCw,
  UserRound,
} from "lucide-react";
import ScoreCard from "../../components/ScoreCard";
import type { Call } from "../../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function statusClass(status: Call["status"]) {
  if (status === "analyzed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "failed") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "analyzing" || status === "transcribing") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "transcribed") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

export default function CallDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [call, setCall] = useState<Call | null>(null);
  const [transcribeStatus, setTranscribeStatus] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchCall = async () => {
    if (!id) return;
    setError(null);
    try {
      const res = await fetch(`${API_URL}/calls/${id}`);
      if (!res.ok) throw new Error("Call record could not be loaded.");
      const data = await res.json();
      setCall(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load call.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCall();
  }, [id]);

  useEffect(() => {
    if (!call || !call.transcription_job_id || call.transcript || transcribeStatus === "COMPLETED" || transcribeStatus === "FAILED") {
      return;
    }

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/calls/${id}/transcribe/status`);
        const data = await res.json();
        setTranscribeStatus(data.status);

        if (data.status === "COMPLETED") {
          clearInterval(poll);
          fetchCall();
        } else if (data.status === "FAILED") {
          clearInterval(poll);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000);

    return () => clearInterval(poll);
  }, [call, id, transcribeStatus]);

  const triggerAnalysis = async () => {
    if (!id) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/calls/${id}/analyze`, { method: "POST" });
      if (!res.ok) throw new Error("Analysis failed. Try again after checking the transcript.");
      await fetchCall();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze call.");
    } finally {
      setAnalyzing(false);
    }
  };

  const copyTranscript = async () => {
    if (!call?.transcript) return;
    await navigator.clipboard.writeText(call.transcript);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-28 animate-pulse rounded-lg bg-white" />
        <div className="h-96 animate-pulse rounded-lg bg-white" />
      </div>
    );
  }

  if (error && !call) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-rose-200 bg-rose-50 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" aria-hidden="true" />
          <div>
            <h1 className="text-base font-black text-rose-950">Call unavailable</h1>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!call) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <button
        onClick={() => router.back()}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>

      <section className="sticky top-0 z-10 rounded-lg border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur lg:top-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-md border px-2 py-1 text-xs font-black uppercase ${statusClass(call.status)}`}>
                {formatStatus(call.status)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500">
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                {call.call_type || "Uncategorized"}
              </span>
            </div>
            <h1 className="truncate text-3xl font-black text-slate-950">{call.lead_name || "Untitled call"}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
              <span>
                Source: <span className="font-bold text-slate-700">{call.lead_source || "Unknown"}</span>
              </span>
              <span>
                Outcome: <span className="font-bold text-slate-700">{call.outcome || "Unknown"}</span>
              </span>
              <span>
                Created: <span className="font-bold text-slate-700">{new Date(call.created_at).toLocaleDateString()}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {call.transcript && !call.analysis && (
              <button
                onClick={triggerAnalysis}
                disabled={analyzing}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {analyzing ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Brain className="h-4 w-4" aria-hidden="true" />}
                {analyzing ? "Analyzing" : "Analyze call"}
              </button>
            )}
            {call.analysis && (
              <span className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Scorecard ready
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}
      </section>

      {!call.transcript && call.transcription_job_id && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 text-blue-700" aria-hidden="true" />
            <div>
              <h3 className="font-black text-blue-950">Transcription in progress</h3>
              <p className="mt-1 text-sm text-blue-700">Status: {transcribeStatus || "Queued"}</p>
            </div>
          </div>
        </div>
      )}

      {call.analysis ? (
        <ScoreCard analysis={call.analysis} />
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <Brain className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-black text-slate-950">Waiting for scorecard</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Once a transcript is available, analyze the call to generate coaching notes and sales psychology feedback.
          </p>
        </div>
      )}

      {call.transcript && (
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-base font-black text-slate-950">Transcript</h3>
              <p className="text-sm text-slate-500">Full source text used for analysis</p>
            </div>
            <button
              onClick={copyTranscript}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <Clipboard className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap p-5 font-sans text-sm leading-7 text-slate-700">
            {call.transcript}
          </pre>
        </section>
      )}
    </div>
  );
}
