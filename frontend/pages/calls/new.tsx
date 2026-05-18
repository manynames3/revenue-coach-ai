import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileAudio,
  FileText,
  Loader2,
  Lock,
  Upload,
  UserRound,
} from "lucide-react";
import type { Rep, UploadUrlResponse } from "../../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const steps = [
  { label: "Rep", icon: UserRound },
  { label: "Context", icon: FileText },
  { label: "Source", icon: Upload },
  { label: "Analyze", icon: Check },
];

export default function NewCall() {
  const router = useRouter();
  const [reps, setReps] = useState<Rep[]>([]);
  const [mode, setMode] = useState<"text" | "audio">("text");
  const [file, setFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    rep_id: "",
    lead_name: "",
    lead_source: "",
    call_type: "",
    outcome: "",
    transcript: "",
  });

  const [status, setStatus] = useState<"idle" | "uploading" | "creating" | "transcribing" | "analyzing" | "completed">("idle");

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/reps`)
      .then((r) => {
        if (!r.ok) throw new Error("Unable to load reps.");
        return r.json();
      })
      .then((rows) => {
        if (!cancelled) setReps(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load reps.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRep = useMemo(() => reps.find((rep) => rep.id === form.rep_id), [reps, form.rep_id]);

  const canSubmit =
    status === "idle" &&
    Boolean(form.rep_id) &&
    Boolean(form.lead_name.trim()) &&
    ((mode === "text" && Boolean(form.transcript.trim())) || (mode === "audio" && Boolean(file)));

  const statusText = {
    idle: "Ready",
    uploading: "Uploading audio",
    creating: "Saving call",
    transcribing: "Starting transcription",
    analyzing: "Generating scorecard",
    completed: "Redirecting",
  }[status];

  const createCallWithText = async () => {
    setStatus("creating");
    const res = await fetch(`${API_URL}/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) throw new Error("Call could not be created.");
    const call = await res.json();

    setStatus("analyzing");
    const analysisRes = await fetch(`${API_URL}/calls/${call.id}/analyze`, { method: "POST" });
    if (!analysisRes.ok) throw new Error("Call was saved, but analysis failed.");

    setStatus("completed");
    router.push(`/calls/${call.id}`);
  };

  const createCallWithAudio = async () => {
    if (!file) return;

    setStatus("uploading");
    const urlRes = await fetch(
      `${API_URL}/calls/upload-url?file_name=${encodeURIComponent(file.name)}&file_type=${encodeURIComponent(file.type)}`,
      { method: "POST" }
    );
    if (!urlRes.ok) throw new Error("Audio upload URL could not be created.");
    const presigned: UploadUrlResponse = await urlRes.json();

    const formData = new FormData();
    Object.entries(presigned.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("file", file);

    const uploadRes = await fetch(presigned.url, { method: "POST", body: formData });
    if (!uploadRes.ok) throw new Error("Audio upload failed.");

    setStatus("creating");
    const callRes = await fetch(`${API_URL}/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, transcript: "" }),
    });
    if (!callRes.ok) throw new Error("Call record could not be created.");
    const call = await callRes.json();

    setStatus("transcribing");
    const transcribeRes = await fetch(`${API_URL}/calls/${call.id}/transcribe?s3_key=${encodeURIComponent(presigned.key)}`, {
      method: "POST",
    });
    if (!transcribeRes.ok) throw new Error("Transcription could not be started.");

    setStatus("completed");
    router.push(`/calls/${call.id}`);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    try {
      if (mode === "text") {
        await createCallWithText();
      } else {
        await createCallWithAudio();
      }
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Unable to process call.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase text-blue-700">Call intake</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Add a sales conversation</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Capture the rep, deal context, and transcript source before generating the scorecard.
          </p>
        </div>
        <div className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
          {status !== "idle" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {statusText}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" aria-hidden="true" />
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="space-y-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const active = currentStep === index;
              const complete =
                (index === 0 && Boolean(form.rep_id)) ||
                (index === 1 && Boolean(form.lead_name.trim())) ||
                (index === 2 && ((mode === "text" && Boolean(form.transcript.trim())) || (mode === "audio" && Boolean(file)))) ||
                (index === 3 && canSubmit);

              return (
                <button
                  key={step.label}
                  onClick={() => setCurrentStep(index)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-3 text-left text-sm font-black ${
                    active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {step.label}
                  </span>
                  {complete && <Check className="h-4 w-4" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-start gap-2">
              <Lock className="mt-0.5 h-4 w-4 text-blue-700" aria-hidden="true" />
              <p className="text-xs leading-5 text-blue-900">
                Audio files upload directly to S3. The API stores transcript and scorecard data for review.
              </p>
            </div>
          </div>
        </aside>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-black text-slate-950">{steps[currentStep].label}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {currentStep === 0 && "Choose the seller connected to this call."}
              {currentStep === 1 && "Add the lead and deal context managers need later."}
              {currentStep === 2 && "Paste a transcript or upload audio for transcription."}
              {currentStep === 3 && "Review the setup and create the scorecard."}
            </p>
          </div>

          <div className="p-5">
            {currentStep === 0 && (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-700">Sales rep</span>
                  <select
                    className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950"
                    value={form.rep_id}
                    onChange={(e) => setForm({ ...form, rep_id: e.target.value })}
                  >
                    <option value="">Select a rep</option>
                    {reps.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedRep && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-black text-slate-950">{selectedRep.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{selectedRep.email || "No email on file"}</p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 1 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm font-black text-slate-700">Lead name</span>
                  <input
                    className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
                    value={form.lead_name}
                    onChange={(e) => setForm({ ...form, lead_name: e.target.value })}
                    placeholder="Jordan Lee"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-black text-slate-700">Lead source</span>
                  <input
                    className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
                    value={form.lead_source}
                    onChange={(e) => setForm({ ...form, lead_source: e.target.value })}
                    placeholder="Referral"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-black text-slate-700">Call type</span>
                  <input
                    className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
                    value={form.call_type}
                    onChange={(e) => setForm({ ...form, call_type: e.target.value })}
                    placeholder="Strategy call"
                  />
                </label>
                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm font-black text-slate-700">Outcome</span>
                  <input
                    className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
                    value={form.outcome}
                    onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                    placeholder="Follow-up scheduled"
                  />
                </label>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
                  <button
                    onClick={() => setMode("text")}
                    className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-black ${
                      mode === "text" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"
                    }`}
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    Transcript
                  </button>
                  <button
                    onClick={() => setMode("audio")}
                    className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-black ${
                      mode === "audio" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"
                    }`}
                  >
                    <FileAudio className="h-4 w-4" aria-hidden="true" />
                    Audio
                  </button>
                </div>

                {mode === "text" ? (
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-slate-700">Transcript</span>
                    <textarea
                      className="min-h-72 w-full rounded-md border border-slate-300 px-3 py-3 font-mono text-sm leading-6"
                      value={form.transcript}
                      onChange={(e) => setForm({ ...form, transcript: e.target.value })}
                      placeholder="Paste the sales call transcript here..."
                    />
                  </label>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <input
                      type="file"
                      id="audio-upload"
                      className="hidden"
                      accept="audio/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="audio-upload" className="mx-auto block max-w-md cursor-pointer">
                      <Upload className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
                      <span className="mt-3 block text-sm font-black text-slate-950">
                        {file ? file.name : "Choose an audio file"}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">MP3, M4A, WAV, or WebM up to 100 MB</span>
                    </label>
                    {file && (
                      <button
                        onClick={() => setFile(null)}
                        className="mt-4 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-white"
                      >
                        Remove file
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <dt className="text-xs font-black uppercase text-slate-400">Rep</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-950">{selectedRep?.name || "Not selected"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-black uppercase text-slate-400">Lead</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-950">{form.lead_name || "Missing"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-black uppercase text-slate-400">Source</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-950">{mode === "text" ? "Transcript" : file?.name || "Audio"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-black uppercase text-slate-400">Call type</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-950">{form.call_type || "Uncategorized"}</dd>
                    </div>
                  </dl>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                >
                  {status !== "idle" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  {mode === "text" ? "Create scorecard" : "Upload and transcribe"}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
            <button
              onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
              disabled={currentStep === 0}
              className="h-9 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep((step) => Math.min(steps.length - 1, step + 1))}
              disabled={currentStep === steps.length - 1}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-40"
            >
              Next
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
