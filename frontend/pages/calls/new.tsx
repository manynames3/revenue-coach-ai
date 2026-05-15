import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { Rep, UploadUrlResponse } from "../../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function NewCall() {
  const router = useRouter();
  const [reps, setReps] = useState<Rep[]>([]);
  const [mode, setMode] = useState<"text" | "audio">("text");
  const [file, setFile] = useState<File | null>(null);
  
  const [form, setForm] = useState({
    rep_id: "",
    lead_name: "",
    lead_source: "",
    call_type: "",
    outcome: "",
    transcript: "",
  });
  
  const [status, setStatus] = useState<"idle" | "uploading" | "creating" | "transcribing" | "completed">("idle");
  const [callId, setCallId] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<string>("");

  useEffect(() => {
    fetch(`${API_URL}/reps`)
      .then((r) => r.json())
      .then(setReps);
  }, []);

  const handleSubmit = async () => {
    if (mode === "text") {
      await createCallWithText();
    } else {
      await createCallWithAudio();
    }
  };

  const createCallWithText = async () => {
    setStatus("creating");
    const res = await fetch(`${API_URL}/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const call = await res.json();
    setCallId(call.id);
    setStatus("completed");
    router.push(`/calls/${call.id}`);
  };

  const createCallWithAudio = async () => {
    if (!file) return;
    
    // 1. Get Presigned URL
    setStatus("uploading");
    const urlRes = await fetch(`${API_URL}/calls/upload-url?file_name=${encodeURIComponent(file.name)}&file_type=${encodeURIComponent(file.type)}`, {
      method: "POST"
    });
    const presigned: UploadUrlResponse = await urlRes.json();

    // 2. Upload to S3
    const formData = new FormData();
    Object.entries(presigned.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("file", file);

    await fetch(presigned.url, {
      method: "POST",
      body: formData,
    });

    // 3. Create Call record
    setStatus("creating");
    const callRes = await fetch(`${API_URL}/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, transcript: "" }), // Transcript will be filled later
    });
    const call = await callRes.json();
    setCallId(call.id);

    // 4. Start Transcription
    setStatus("transcribing");
    await fetch(`${API_URL}/calls/${call.id}/transcribe?s3_key=${encodeURIComponent(presigned.key)}`, {
      method: "POST"
    });

    setStatus("completed");
    router.push(`/calls/${call.id}`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Call</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="space-y-4">
          <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
            <button 
              onClick={() => setMode("text")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === "text" ? "bg-white shadow text-blue-600" : "text-gray-600 hover:text-gray-900"}`}
            >
              Text Transcript
            </button>
            <button 
              onClick={() => setMode("audio")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === "audio" ? "bg-white shadow text-blue-600" : "text-gray-600 hover:text-gray-900"}`}
            >
              Audio Upload
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sales Rep</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.rep_id}
              onChange={(e) => setForm({ ...form, rep_id: e.target.value })}
            >
              <option value="">Select a rep</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Lead Name</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.lead_name}
              onChange={(e) => setForm({ ...form, lead_name: e.target.value })}
              placeholder="e.g. John Smith"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Lead Source</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.lead_source}
                onChange={(e) => setForm({ ...form, lead_source: e.target.value })}
                placeholder="Google, Referral..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Call Type</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.call_type}
                onChange={(e) => setForm({ ...form, call_type: e.target.value })}
                placeholder="Discovery, Demo..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Outcome</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.outcome}
                onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                placeholder="Set follow-up, Closed..."
              />
            </div>
          </div>

          {mode === "text" ? (
            <div>
              <label className="block text-sm font-medium mb-1">Transcript</label>
              <textarea
                className="w-full border rounded px-3 py-2 h-48 font-mono text-sm"
                value={form.transcript}
                onChange={(e) => setForm({ ...form, transcript: e.target.value })}
                placeholder="Paste the sales call transcript here..."
              />
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <input
                type="file"
                id="audio-upload"
                className="hidden"
                accept="audio/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="audio-upload" className="cursor-pointer group">
                <div className="text-4xl mb-2 text-gray-400 group-hover:text-blue-500 transition-colors">🎙️</div>
                <div className="text-sm font-medium text-gray-900">
                  {file ? file.name : "Click to upload audio file"}
                </div>
                <p className="text-xs text-gray-500 mt-1">MP3, M4A, WAV up to 100MB</p>
              </label>
              {file && (
                <button 
                  onClick={() => setFile(null)}
                  className="mt-4 text-xs text-red-600 hover:text-red-700 underline"
                >
                  Remove file
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={status !== "idle" || !form.rep_id || (mode === "text" && !form.transcript) || (mode === "audio" && !file)}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
          >
            {status === "idle" && (mode === "text" ? "Create & Analyze" : "Upload & Transcribe")}
            {status === "uploading" && <span>⏳ Uploading to S3...</span>}
            {status === "creating" && <span>📂 Saving Call Record...</span>}
            {status === "transcribing" && <span>🤖 Starting AI Transcribe...</span>}
            {status === "completed" && <span>✅ Done! Redirecting...</span>}
          </button>
          
          <p className="text-xs text-gray-500 text-center">
            Audio processing takes ~30 seconds for a typical sales call.
          </p>
        </div>
      </div>
    </div>
  );
}
