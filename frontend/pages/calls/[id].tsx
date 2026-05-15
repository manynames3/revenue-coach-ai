import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import ScoreCard from "../../components/ScoreCard";

interface Call {
  id: string;
  rep_id: string;
  lead_name: string | null;
  lead_source: string | null;
  call_type: string | null;
  outcome: string | null;
  transcript: string | null;
  analysis: any;
}

export default function CallDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [call, setCall] = useState<Call | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`http://localhost:8000/calls/${id}`)
      .then((r) => r.json())
      .then(setCall);
  }, [id]);

  if (!call) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <button onClick={() => router.back()} className="text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back
      </button>

      <h1 className="text-2xl font-bold mb-2">{call.lead_name || "Call Detail"}</h1>
      <div className="text-sm text-gray-500 mb-6 space-x-4">
        {call.call_type && <span>Type: {call.call_type}</span>}
        {call.lead_source && <span>Source: {call.lead_source}</span>}
        {call.outcome && <span>Outcome: {call.outcome}</span>}
      </div>

      {call.analysis ? (
        <ScoreCard analysis={call.analysis} />
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">This call has not been analyzed yet.</p>
        </div>
      )}

      {call.transcript && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h3 className="text-lg font-semibold mb-3">Transcript</h3>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{call.transcript}</pre>
        </div>
      )}
    </div>
  );
}
