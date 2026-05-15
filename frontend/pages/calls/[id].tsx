import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import ScoreCard from "../../components/ScoreCard";
import type { Call, Analysis } from "../../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CallDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [call, setCall] = useState<Call | null>(null);
  const [transcribeStatus, setTranscribeStatus] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);

  const fetchCall = async () => {
    if (!id) return;
    const res = await fetch(`${API_URL}/calls/${id}`);
    const data = await res.json();
    setCall(data);
  };

  useEffect(() => {
    fetchCall();
  }, [id]);

  // Polling for Transcription Status
  useEffect(() => {
    if (!call || !call.transcription_job_id || call.transcript || transcribeStatus === "COMPLETED" || transcribeStatus === "FAILED") return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/calls/${id}/transcribe/status`);
        const data = await res.json();
        setTranscribeStatus(data.status);
        
        if (data.status === "COMPLETED") {
          clearInterval(poll);
          fetchCall(); // Refresh to get the transcript
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
    try {
      await fetch(`${API_URL}/calls/${id}/analyze`, { method: "POST" });
      fetchCall(); // Refresh to get the analysis
    } finally {
      setAnalyzing(false);
    }
  };

  if (!call) return <div className="p-8 text-center text-gray-500">Loading call data...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => router.back()} className="text-blue-600 hover:underline mb-4 inline-block font-medium">
        &larr; Back to List
      </button>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{call.lead_name || "Untitled Call"}</h1>
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded">{call.call_type || "No Type"}</span>
            <span>Source: <span className="text-gray-900 font-medium">{call.lead_source || "Unknown"}</span></span>
            <span>Outcome: <span className="text-gray-900 font-medium">{call.outcome || "Unknown"}</span></span>
          </div>
        </div>

        {call.transcript && !call.analysis && (
          <button
            onClick={triggerAnalysis}
            disabled={analyzing}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {analyzing ? "🧠 AI Coaching in progress..." : "Coach with AI"}
          </button>
        )}
      </div>

      {!call.transcript && call.transcription_job_id && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 flex items-center space-x-4">
          <div className="text-2xl animate-pulse">🎙️</div>
          <div>
            <h3 className="font-semibold text-blue-900">Transcription in Progress</h3>
            <p className="text-blue-700 text-sm">Status: {transcribeStatus || "Queued"}... Page will update automatically.</p>
          </div>
        </div>
      )}

      {call.analysis ? (
        <ScoreCard analysis={call.analysis} />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-gray-400 text-5xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Waiting for Analysis</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Once the transcript is ready, click the "Coach with AI" button to get a full performance scorecard.
          </p>
        </div>
      )}

      {call.transcript && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
          <div className="flex justify-between items-center mb-4 pb-4 border-b">
            <h3 className="text-lg font-bold text-gray-900">Full Call Transcript</h3>
            <button className="text-xs text-blue-600 font-medium hover:underline">Copy Transcript</button>
          </div>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{call.transcript}</pre>
        </div>
      )}
    </div>
  );
}
