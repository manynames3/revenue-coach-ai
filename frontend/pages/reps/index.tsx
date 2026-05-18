import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Mail, Phone, Plus, RefreshCw, UserRound, Users } from "lucide-react";
import type { Call, Rep } from "../../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RepStats {
  total: number;
  analyzed: number;
  inProgress: number;
}

function formatCoverage(stats: RepStats) {
  if (stats.total === 0) return "-";
  return `${Math.round((stats.analyzed / stats.total) * 100)}%`;
}

export default function RepsPage() {
  const [reps, setReps] = useState<Rep[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [repsResponse, callsResponse] = await Promise.all([fetch(`${API_URL}/reps`), fetch(`${API_URL}/calls`)]);
      if (!repsResponse.ok || !callsResponse.ok) throw new Error("Unable to load rep data.");
      const [repRows, callRows] = await Promise.all([repsResponse.json(), callsResponse.json()]);
      setReps(repRows);
      setCalls(callRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load reps.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const statsByRep = useMemo(() => {
    const stats: Record<string, RepStats> = {};
    reps.forEach((rep) => {
      stats[rep.id] = { total: 0, analyzed: 0, inProgress: 0 };
    });

    calls.forEach((call) => {
      if (!stats[call.rep_id]) stats[call.rep_id] = { total: 0, analyzed: 0, inProgress: 0 };
      stats[call.rep_id].total += 1;
      if (call.status === "analyzed") stats[call.rep_id].analyzed += 1;
      if (call.status === "analyzing" || call.status === "transcribing") stats[call.rep_id].inProgress += 1;
    });

    return stats;
  }, [calls, reps]);

  const createRep = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/reps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });
      if (!response.ok) throw new Error("Rep could not be created.");
      setName("");
      setEmail("");
      setPhone("");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create rep.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase text-blue-700">Team management</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Sales reps</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Track who is being reviewed and keep enough rep context for coaching workflows.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" aria-hidden="true" />
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-black text-slate-950">Add rep</h2>
            <p className="text-sm text-slate-500">Create a seller profile for future calls.</p>
          </div>
          <div className="space-y-4 p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">Name</span>
              <input
                className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
                placeholder="Avery Seller"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">Email</span>
              <input
                className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
                placeholder="avery@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">Phone</span>
              <input
                className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <button
              onClick={createRep}
              disabled={saving || !name.trim()}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              Add rep
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-black text-slate-950">Rep roster</h2>
              <p className="text-sm text-slate-500">{reps.length} reps tracked</p>
            </div>
            <Users className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : reps.length === 0 ? (
            <div className="p-8 text-center">
              <UserRound className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
              <h3 className="mt-4 text-base font-black text-slate-950">No reps yet</h3>
              <p className="mt-2 text-sm text-slate-500">Add the first rep to start assigning calls.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Rep</th>
                    <th className="px-5 py-3">Contact</th>
                    <th className="px-5 py-3">Calls</th>
                    <th className="px-5 py-3">Analyzed</th>
                    <th className="px-5 py-3">Processing</th>
                    <th className="px-5 py-3">Review coverage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reps.map((rep) => {
                    const stats = statsByRep[rep.id] || { total: 0, analyzed: 0, inProgress: 0 };
                    return (
                      <tr key={rep.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                              <UserRound className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <div>
                              <p className="font-black text-slate-950">{rep.name}</p>
                              <p className="text-xs text-slate-500">Org {rep.organization_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1 text-sm text-slate-600">
                            <p className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                              {rep.email || "No email"}
                            </p>
                            <p className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                              {rep.phone || "No phone"}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-black text-slate-950">{stats.total}</td>
                        <td className="px-5 py-4 text-sm font-black text-slate-950">{stats.analyzed}</td>
                        <td className="px-5 py-4 text-sm font-black text-slate-950">{stats.inProgress}</td>
                        <td className="px-5 py-4 text-sm font-black text-slate-950">{formatCoverage(stats)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
