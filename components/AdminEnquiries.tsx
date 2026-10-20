"use client";
import { useEffect, useState } from "react";

type Enquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  intent: string;
  status: string;
  createdAt: string;
};

export default function AdminEnquiries() {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/enquiries");
      const data = await res.json();
      if (res.ok) setRows(data.enquiries || []);
      else setMsg(data?.message || "Could not load enquiries.");
    } catch {
      setMsg("Could not load enquiries.");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await fetch("/api/admin/enquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  if (loading) return <div className="container-px py-12">Loading enquiries…</div>;

  return (
    <section className="container-px py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Enquiries</h1>
          <p className="muted mt-2">Messages from your contact form.</p>
        </div>
        <div className="flex gap-2">
          <a href="/admin" className="btn-ghost text-xs">Customers</a>
          <a href="/admin/orders" className="btn-ghost text-xs">Payments</a>
          <button onClick={load} className="btn-ghost text-xs">Refresh</button>
        </div>
      </div>

      {msg && <div className="mb-5 rounded-xl border border-line px-4 py-3 text-sm">{msg}</div>}

      {rows.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-lg font-medium">No enquiries yet</p>
          <p className="muted mt-2 text-sm">Contact form messages will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold">
                    {r.name}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        r.status === "new"
                          ? "bg-emerald/20 text-emerald"
                          : "bg-white/10 muted"
                      }`}
                    >
                      {r.status}
                    </span>
                  </p>
                  <p className="muted mt-1 text-xs">
                    <a href={`mailto:${r.email}`} className="hover:text-emerald">{r.email}</a>
                    {r.phone && <> · <a href={`tel:${r.phone}`} className="hover:text-emerald">{r.phone}</a></>}
                    {r.company && <> · {r.company}</>}
                  </p>
                  {r.message && <p className="mt-3 text-sm leading-relaxed">{r.message}</p>}
                  <p className="muted mt-2 text-xs">
                    {r.intent} · {new Date(r.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.status !== "contacted" && (
                    <button onClick={() => setStatus(r.id, "contacted")} className="btn-ghost text-xs">
                      Mark contacted
                    </button>
                  )}
                  {r.status !== "closed" && (
                    <button onClick={() => setStatus(r.id, "closed")} className="btn-ghost text-xs">
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
