"use client";
import { useEffect, useState } from "react";

type Order = {
  id: string;
  userId: string;
  userName: string | null;
  planId: string;
  planName: string;
  amount: number;
  months: number;
  reference: string;
  payerNote: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt: string | null;
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      if (res.ok) setOrders(data.orders || []);
      else setMsg(data?.message || data?.error || "Could not load orders.");
    } catch {
      setMsg("Could not load orders.");
    } finally {
      setLoading(false);
    }
  }

  async function decide(id: string, action: "approve" | "reject") {
    if (action === "approve" && !confirm("Confirm the money is in your account before activating.")) {
      return;
    }
    setBusyId(id);
    setMsg("");
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(action === "approve" ? "Plan activated ✓" : "Order rejected.");
        load();
      } else {
        setMsg(data?.message || "Could not update the order.");
      }
    } catch {
      setMsg("Could not update the order.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="container-px py-12">Loading orders…</div>;

  const pending = orders.filter((o) => o.status === "pending");
  const past = orders.filter((o) => o.status !== "pending");

  return (
    <section className="container-px py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Payments</h1>
          <p className="muted mt-2">Check the money has arrived, then activate the plan.</p>
        </div>
        <div className="flex gap-2">
          <a href="/admin" className="btn-ghost text-xs">Customers</a>
          <button onClick={load} className="btn-ghost text-xs">Refresh</button>
        </div>
      </div>

      {msg && (
        <div className="mb-5 rounded-xl border border-emerald/30 bg-emerald/[0.06] px-4 py-3 text-sm">
          {msg}
        </div>
      )}

      <h2 className="font-display text-lg font-semibold">
        Waiting for you{pending.length > 0 && ` (${pending.length})`}
      </h2>

      {pending.length === 0 ? (
        <p className="muted mt-3 text-sm">Nothing pending. New payments will appear here.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {pending.map((o) => (
            <div key={o.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold">
                    {o.planName} — ₹{o.amount.toLocaleString("en-IN")}
                  </p>
                  <p className="muted mt-1 font-mono text-xs">{o.userId}</p>
                  {o.userName && <p className="muted text-xs">{o.userName}</p>}
                  <p className="mt-3 text-xs">
                    <span className="muted">Reference </span>
                    <span className="font-mono font-semibold">{o.reference}</span>
                  </p>
                  {o.payerNote && (
                    <p className="muted mt-1 text-xs">Note: {o.payerNote}</p>
                  )}
                  <p className="muted mt-1 text-xs">
                    {new Date(o.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => decide(o.id, "approve")}
                    disabled={busyId === o.id}
                    className="btn-primary text-xs disabled:opacity-50"
                  >
                    {busyId === o.id ? "…" : "Activate plan"}
                  </button>
                  <button
                    onClick={() => decide(o.id, "reject")}
                    disabled={busyId === o.id}
                    className="btn-ghost text-xs disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="font-display mt-12 text-lg font-semibold">History</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-3 py-2 text-left font-semibold">Customer</th>
                  <th className="px-3 py-2 text-left font-semibold">Plan</th>
                  <th className="px-3 py-2 text-left font-semibold">Amount</th>
                  <th className="px-3 py-2 text-left font-semibold">Reference</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-left font-semibold">Decided</th>
                </tr>
              </thead>
              <tbody>
                {past.map((o) => (
                  <tr key={o.id} className="border-b border-line">
                    <td className="px-3 py-2 font-mono text-xs">{o.userId}</td>
                    <td className="px-3 py-2">{o.planName}</td>
                    <td className="px-3 py-2">₹{o.amount.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 font-mono text-xs">{o.reference}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          o.status === "approved"
                            ? "bg-emerald/20 text-emerald"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs muted">
                      {o.decidedAt ? new Date(o.decidedAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
