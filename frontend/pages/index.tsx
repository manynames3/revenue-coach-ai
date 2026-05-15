import { useEffect, useState } from "react";
import Link from "next/link";
import type { DashboardOverview } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Dashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/dashboard/overview`)
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Platform Overview</h1>
        <Link 
          href="/calls/new" 
          className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
        >
          + New Sales Call
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Reps" value={data.total_reps} icon="👥" />
        <StatCard label="Total Calls" value={data.total_calls} icon="📞" />
        <StatCard label="Analyzed" value={data.analyzed_calls} icon="🧠" />
        <StatCard label="Avg Performance" value={`${data.average_score}%`} icon="📈" color="text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-gray-900">Recent AI Scorecards</h2>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Last 10 Calls</span>
          </div>
          {data.recent_scores.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 mb-4">No calls analyzed yet.</p>
              <Link href="/calls/new" className="text-blue-600 font-bold hover:underline">Get started &rarr;</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.recent_scores.map((s, i) => (
                <Link
                  key={i}
                  href={`/calls/${s.call_id}`}
                  className="block px-6 py-4 hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{s.lead_name || "Unknown Lead"}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Analyzed on {new Date(s.analyzed_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-xl font-black text-blue-600">{s.overall_score}</p>
                        <p className="text-[10px] uppercase text-gray-400 font-bold">Score</p>
                      </div>
                      <span className="text-gray-300">&rarr;</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {data.top_rep_name && (
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
              <p className="text-blue-100 text-sm font-bold uppercase tracking-tight mb-4 flex items-center">
                <span className="mr-2">🏆</span> Top Performer
              </p>
              <p className="text-3xl font-black mb-1">{data.top_rep_name}</p>
              <div className="flex items-end space-x-2">
                <span className="text-4xl font-bold">{data.top_rep_score}</span>
                <span className="text-blue-200 text-sm mb-1 font-medium">/ 100 avg</span>
              </div>
              <div className="mt-6 pt-6 border-t border-blue-500/30">
                <button className="w-full bg-white/10 hover:bg-white/20 py-2 rounded-lg text-sm font-bold transition-colors">
                  View Rep Profile
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Quick Insights</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <span className="bg-orange-100 p-1.5 rounded mr-3">💡</span>
                <p className="text-sm text-gray-600">3 calls missing budget qualification this week.</p>
              </li>
              <li className="flex items-start">
                <span className="bg-green-100 p-1.5 rounded mr-3">🚀</span>
                <p className="text-sm text-gray-600">Rapport scores are up 12% across the team.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color = "text-blue-600" }: { label: string; value: string | number; icon: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center">
      <div className="text-3xl mr-4">{icon}</div>
      <div>
        <p className="text-2xl font-black text-gray-900">{value}</p>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
