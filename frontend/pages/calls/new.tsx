import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { Rep } from "../../types";

export default function NewCall() {
  const router = useRouter();
  const [reps, setReps] = useState<Rep[]>([]);
  const [form, setForm] = useState({
    rep_id: "",
    lead_name: "",
    lead_source: "",
    call_type: "",
    outcome: "",
    transcript: "",
  });
  const [creating, setCreating] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:8000/reps")
      .then((r) => r.json())
      .then(setReps);
  }, []);

  const createCall = async () => {
    setCreating(true);
    const res = await fetch("http://localhost:8000/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const call = await res.json();
    setCallId(call.id);
    setCreating(false);
  };

  const analyzeCall = async () => {
    if (!callId) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`http://localhost:8000/calls/${callId}/analyze`, {
        method: "POST",
      });
      const data = await res.json();
      setAnalysis(data);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Call</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="space-y-4">
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
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Lead Source</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.lead_source}
                onChange={(e) => setForm({ ...form, lead_source: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Call Type</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.call_type}
                onChange={(e) => setForm({ ...form, call_type: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Outcome</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.outcome}
                onChange={(e) => setForm({ ...form, outcome: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Transcript</label>
            <textarea
              className="w-full border rounded px-3 py-2 h-48 font-mono text-sm"
              value={form.transcript}
              onChange={(e) => setForm({ ...form, transcript: e.target.value })}
              placeholder="Paste the sales call transcript here..."
            />
          </div>

          {!callId ? (
            <button
              onClick={createCall}
              disabled={creating || !form.rep_id || !form.transcript}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Call"}
            </button>
          ) : !analysis ? (
            <div>
              <p className="text-green-600 mb-2">Call created successfully.</p>
              <button
                onClick={analyzeCall}
                disabled={analyzing}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {analyzing ? "Analyzing..." : "Analyze with GLM 5.1"}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-green-600 mb-2">Analysis complete!</p>
              <button
                onClick={() => router.push(`/calls/${callId}`)}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                View Full Scorecard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
