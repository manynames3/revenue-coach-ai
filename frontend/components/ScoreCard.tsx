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
  const textColor = value >= 80 ? "text-green-700" : value >= 60 ? "text-yellow-700" : "text-red-700";
  
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{label.replace(/_/g, " ")}</span>
        <span className={`text-sm font-black ${textColor}`}>{value}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${color}`} 
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );
}

export default function ScoreCard({ analysis }: { analysis: Analysis }) {
  return (
    <div className="space-y-8">
      {/* Header Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/3 bg-blue-600 p-8 text-white flex flex-col justify-center items-center text-center">
            <span className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2">AI Performance Score</span>
            <div className="text-7xl font-black mb-2">{analysis.overall_score ?? "—"}</div>
            <div className="bg-white/20 px-4 py-1 rounded-full text-sm font-medium">
              {analysis.overall_score && analysis.overall_score >= 80 ? "Excellent" : analysis.overall_score && analysis.overall_score >= 60 ? "Average" : "Needs Work"}
            </div>
          </div>
          <div className="md:w-2/3 p-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-tight mb-3 flex items-center">
              <span className="mr-2">🧠</span> Executive Summary
            </h3>
            <p className="text-lg text-gray-800 leading-relaxed font-medium">
              {analysis.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Grid for Scores and Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Category Scores */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2 text-blue-500">📊</span> Metrics breakdown
            </h3>
            <div className="space-y-3">
              {analysis.scores && Object.entries(analysis.scores).map(([key, val]) => (
                <ScoreBar key={key} label={key} value={val ?? 0} />
              ))}
            </div>
          </div>

          {analysis.coaching_drill && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100 p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center">
                <span className="mr-2">🎯</span> Suggested Drill
              </h3>
              <p className="text-blue-800 text-sm leading-relaxed font-medium">
                {analysis.coaching_drill}
              </p>
            </div>
          )}
        </div>

        {/* Center & Right Column: Highlights, Objections, Signals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Strengths & Missed Opportunities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-2xl border border-green-100 p-6">
              <h3 className="font-bold text-green-900 mb-4 flex items-center uppercase text-xs tracking-widest">
                <span className="mr-2">✅</span> What went well
              </h3>
              <ul className="space-y-3">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-green-800 flex items-start">
                    <span className="mr-2 mt-1 block w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-orange-50 rounded-2xl border border-orange-100 p-6">
              <h3 className="font-bold text-orange-900 mb-4 flex items-center uppercase text-xs tracking-widest">
                <span className="mr-2">⚠️</span> Needs improvement
              </h3>
              <ul className="space-y-3">
                {analysis.missed_opportunities.map((m, i) => (
                  <li key={i} className="text-sm text-orange-800 flex items-start">
                    <span className="mr-2 mt-1 block w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Objections */}
          {analysis.objections.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-900 flex items-center uppercase text-xs tracking-widest">
                <span className="mr-2 text-red-500">🛡️</span> Key Objections Handled
              </div>
              <div className="p-0 divide-y divide-gray-100">
                {analysis.objections.map((o, i) => (
                  <div key={i} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <span className="bg-red-100 text-red-700 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-tighter">
                        {o.type}
                      </span>
                      <span className={`text-[10px] font-bold uppercase ${o.rep_response_quality === 'good' ? 'text-green-600' : 'text-orange-500'}`}>
                        Rep Response: {o.rep_response_quality}
                      </span>
                    </div>
                    <p className="text-gray-900 font-bold mb-2">"{o.customer_quote}"</p>
                    <div className="bg-blue-50 border-l-2 border-blue-400 p-3 text-sm text-blue-900 italic">
                      <span className="font-bold not-italic text-blue-600 block text-[10px] uppercase mb-1">Coach Recommendation:</span>
                      {o.better_response}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buying Signals */}
          {analysis.buying_signals.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-black text-gray-900 mb-4 flex items-center uppercase text-xs tracking-widest">
                <span className="mr-2 text-green-500">💎</span> Buying Signals detected
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.buying_signals.map((b, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-100 p-4 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${b.strength === 'strong' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800'}`}>
                        {b.strength}
                      </span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm mb-1">{b.signal}</p>
                    <p className="text-xs text-gray-500 leading-tight">{b.why_it_matters}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up Assets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {analysis.follow_up_sms && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest flex items-center">
                    <span className="mr-2">📱</span> Ready SMS
                  </h3>
                  <button 
                    onClick={() => navigator.clipboard.writeText(analysis.follow_up_sms || "")}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                  >
                    Copy
                  </button>
                </div>
                <div className="bg-gray-100 p-4 rounded-xl text-sm text-gray-800 font-medium">
                  {analysis.follow_up_sms}
                </div>
              </div>
            )}
            
            {analysis.follow_up_email && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest flex items-center">
                    <span className="mr-2">📧</span> Draft Email
                  </h3>
                  <button 
                    onClick={() => navigator.clipboard.writeText(analysis.follow_up_email?.body || "")}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Subject: {analysis.follow_up_email.subject}</p>
                <div className="bg-gray-100 p-4 rounded-xl text-xs text-gray-800 font-medium line-clamp-4 overflow-hidden">
                  {analysis.follow_up_email.body}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
