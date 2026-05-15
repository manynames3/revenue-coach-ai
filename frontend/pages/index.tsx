import { useEffect, useState } from "react";
import Link from "next/link";
import type { DashboardOverview } from "../types";

export default function Dashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null);

  useEffect(() => {
    fetch("http://localhost:8000/dashboard/overview")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="text-gray-500">Loading dashboard...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{data.total_reps}</p>
          <p className="text-sm text-gray-500">Reps</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{data.total_calls}</p>
          <p className="text-sm text-gray-500">Calls</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{data.analyzed_calls}</p>
          <p className="text-sm text-gray-500">Analyzed</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{data.average_score}</p>
          <p className="text-sm text-gray-500">Avg Score</p>
        </div>
      </div>

      {data.top_rep_name && (
        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <p className="text-sm text-gray-500">Top Performer</p>
          <p className="text-xl font-semibold">{data.top_rep_name}</p>
          <p className="text-2xl font-bold text-green-600">{data.top_rep_score}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Recent Analyses</h2>
        {data.recent_scores.length === 0 ? (
          <p className="text-gray-500">No analyses yet. <Link href="/calls/new" className="text-blue-600 hover:underline">Create a call</Link></p>
        ) : (
          <div className="space-y-2">
            {data.recent_scores.map((s, i) => (
              <Link
                key={i}
                href={`/calls/${s.call_id}`}
                className="block p-3 bg-gray-50 rounded hover:bg-blue-50"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{s.lead_name || "Unknown"}</span>
                  <span className="text-lg font-bold text-blue-600">{s.overall_score}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
