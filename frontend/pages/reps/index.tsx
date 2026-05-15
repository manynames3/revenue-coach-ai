import { useEffect, useState } from "react";
import type { Rep } from "../../types";

export default function RepsPage() {
  const [reps, setReps] = useState<Rep[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const fetchReps = () => {
    fetch("http://localhost:8000/reps")
      .then((r) => r.json())
      .then(setReps);
  };

  useEffect(() => {
    fetchReps();
  }, []);

  const createRep = async () => {
    if (!name) return;
    await fetch("http://localhost:8000/reps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone }),
    });
    setName("");
    setEmail("");
    setPhone("");
    fetchReps();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Sales Reps</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6 max-w-md">
        <h2 className="text-lg font-semibold mb-3">Add Rep</h2>
        <div className="space-y-3">
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button
            onClick={createRep}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Rep
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {reps.length === 0 ? (
          <p className="p-6 text-gray-500">No reps yet.</p>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b">
              <tr className="text-sm text-gray-500">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Phone</th>
              </tr>
            </thead>
            <tbody>
              {reps.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-gray-600">{r.email || "—"}</td>
                  <td className="p-3 text-gray-600">{r.phone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
