import React from "react";

interface Scores {
  rapport?: number;
  discovery?: number;
  objection_handling?: number;
  closing?: number;
  follow_up?: number;
}

interface Objection {
  type: string;
  customer_quote: string;
  rep_response_quality: string;
  better_response: string;
}

interface BuyingSignal {
  signal: string;
  strength: string;
  why_it_matters: string;
}

interface Analysis {
  id: string;
  overall_score: number | null;
  summary: string | null;
  scores: Scores | null;
  strengths: string[];
  missed_opportunities: string[];
  objections: Objection[];
  buying_signals: BuyingSignal[];
  manager_notes: string[];
  coaching_drill: string | null;
  follow_up_sms: string | null;
  follow_up_email: { subject: string; body: string } | null;
  created_at: string | null;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "bg-green-500" : value >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="mb-2">
      <div className="flex justify-between text-sm mb-1">
        <span className="capitalize">{label.replace(/_/g, " ")}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  );
}

export default function ScoreCard({ analysis }: { analysis: Analysis }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Overall Score</h2>
          <span className="text-4xl font-bold text-blue-600">{analysis.overall_score ?? "—"}</span>
        </div>
        <p className="text-gray-700">{analysis.summary}</p>
      </div>

      {analysis.scores && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Category Scores</h3>
          {Object.entries(analysis.scores).map(([key, val]) => (
            <ScoreBar key={key} label={key} value={val ?? 0} />
          ))}
        </div>
      )}

      {analysis.strengths.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3 text-green-700">Strengths</h3>
          <ul className="list-disc list-inside space-y-1">
            {analysis.strengths.map((s, i) => <li key={i} className="text-gray-700">{s}</li>)}
          </ul>
        </div>
      )}

      {analysis.missed_opportunities.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3 text-orange-700">Missed Opportunities</h3>
          <ul className="list-disc list-inside space-y-1">
            {analysis.missed_opportunities.map((m, i) => <li key={i} className="text-gray-700">{m}</li>)}
          </ul>
        </div>
      )}

      {analysis.objections.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3 text-red-700">Objections</h3>
          {analysis.objections.map((o, i) => (
            <div key={i} className="mb-4 p-3 bg-red-50 rounded">
              <p><strong>Type:</strong> {o.type}</p>
              <p className="italic mt-1">"{o.customer_quote}"</p>
              <p className="mt-1"><strong>Rep Response:</strong> {o.rep_response_quality}</p>
              <p className="mt-1"><strong>Better Response:</strong> {o.better_response}</p>
            </div>
          ))}
        </div>
      )}

      {analysis.buying_signals.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3 text-green-700">Buying Signals</h3>
          {analysis.buying_signals.map((b, i) => (
            <div key={i} className="mb-3 p-3 bg-green-50 rounded">
              <p><strong>Signal:</strong> {b.signal}</p>
              <p><strong>Strength:</strong> <span className={
                b.strength === "strong" ? "text-green-600" : b.strength === "medium" ? "text-yellow-600" : "text-gray-500"
              }>{b.strength}</span></p>
              <p className="text-sm text-gray-600 mt-1">{b.why_it_matters}</p>
            </div>
          ))}
        </div>
      )}

      {analysis.manager_notes.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Manager Notes</h3>
          <ul className="list-disc list-inside space-y-1">
            {analysis.manager_notes.map((n, i) => <li key={i} className="text-gray-700">{n}</li>)}
          </ul>
        </div>
      )}

      {analysis.coaching_drill && (
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <h3 className="text-lg font-semibold mb-2 text-blue-700">Coaching Drill</h3>
          <p className="text-gray-700">{analysis.coaching_drill}</p>
        </div>
      )}

      {analysis.follow_up_sms && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Follow-Up SMS</h3>
          <div className="bg-gray-100 p-3 rounded">
            <p className="text-gray-800 whitespace-pre-wrap">{analysis.follow_up_sms}</p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(analysis.follow_up_sms || "")}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Copy SMS
          </button>
        </div>
      )}

      {analysis.follow_up_email && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Follow-Up Email</h3>
          <div className="bg-gray-100 p-3 rounded">
            <p className="font-medium">{analysis.follow_up_email.subject}</p>
            <p className="text-gray-800 whitespace-pre-wrap mt-2">{analysis.follow_up_email.body}</p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(
              `Subject: ${analysis.follow_up_email?.subject || ""}\n\n${analysis.follow_up_email?.body || ""}`
            )}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Copy Email
          </button>
        </div>
      )}
    </div>
  );
}
