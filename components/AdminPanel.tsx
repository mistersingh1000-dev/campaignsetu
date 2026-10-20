"use client";
import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  trial_ends_at: string;
  phone_number_id: string | null;
  waba_id: string | null;
  wa_registered?: boolean;
  wa_registration_error?: string | null;
  created_at: string;
};

const PLAN_DURATIONS = [
  { value: "1", label: "1 Month" },
  { value: "3", label: "3 Months" },
  { value: "6", label: "6 Months" },
  { value: "12", label: "1 Year" },
  { value: "36", label: "3 Years" },
  { value: "60", label: "5 Years" },
  { value: "120", label: "10 Years" },
  { value: "lifetime", label: "Lifetime" },
] as const;

function addMonthsClamped(base: Date, months: number): Date {
  const out = new Date(base);
  const originalDay = out.getUTCDate();
  out.setUTCDate(1);
  out.setUTCMonth(out.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(out.getUTCFullYear(), out.getUTCMonth() + 1, 0)).getUTCDate();
  out.setUTCDate(Math.min(originalDay, lastDay));
  return out;
}

function paidAccessEnd(user: User, duration: string): string {
  if (duration === "lifetime") return "2099-12-31T23:59:59.999Z";

  const now = new Date();
  const existing = new Date(user.trial_ends_at);
  const base = Number.isFinite(existing.getTime()) && existing.getTime() > now.getTime() ? existing : now;
  return addMonthsClamped(base, Number(duration)).toISOString();
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ plan: "trial", trial_ends_at: "" });
  const [grantingUser, setGrantingUser] = useState<User | null>(null);
  const [grantDuration, setGrantDuration] = useState("1");
  const [grantBusy, setGrantBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        if (msg === "unauthorized") setMsg("");
      } else {
        setMsg(data.error || "Failed to load users");
      }
    } catch {
      setMsg("Error loading users");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user: User) => {
    setGrantingUser(null);
    setEditingEmail(user.email);
    setEditForm({ plan: user.plan, trial_ends_at: user.trial_ends_at.split("T")[0] });
    setMsg("");
  };

  const startGrant = (user: User) => {
    setEditingEmail(null);
    setGrantingUser(user);
    setGrantDuration("1");
    setMsg("");
  };

  const save = async () => {
    if (!editingEmail || !editForm.trial_ends_at) return;
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(editingEmail)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: editForm.plan,
          trial_ends_at: new Date(`${editForm.trial_ends_at}T23:59:59.999Z`).toISOString(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("Customer updated ✓");
        setEditingEmail(null);
        await load();
      } else {
        setMsg(data.error || "Update failed");
      }
    } catch {
      setMsg("Error saving");
    }
  };

  const givePlan = async () => {
    if (!grantingUser) return;
    setGrantBusy(true);
    setMsg("");
    try {
      const accessEnd = paidAccessEnd(grantingUser, grantDuration);
      const res = await fetch(`/api/admin/users/${encodeURIComponent(grantingUser.email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "paid", trial_ends_at: accessEnd }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || data.message || "Could not give plan");
        return;
      }
      const label = PLAN_DURATIONS.find((d) => d.value === grantDuration)?.label || "Paid";
      setMsg(`${label} paid plan activated for ${grantingUser.email} ✓`);
      setGrantingUser(null);
      await load();
    } catch {
      setMsg("Error giving paid plan");
    } finally {
      setGrantBusy(false);
    }
  };

  if (loading) return <div className="p-6">Loading users...</div>;

  return (
    <section className="container-px py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
        <p className="muted mt-2">Manage customers, plans, payments and WhatsApp activation status.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/admin/system-health" className="btn-primary text-xs">System Health</a>
          <a href="/admin/orders" className="btn-ghost text-xs">Payments</a>
          <a href="/admin/enquiries" className="btn-ghost text-xs">Enquiries</a>
          <a href="/admin/conversations" className="btn-ghost text-xs">Conversations</a>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${msg === "unauthorized" ? "border-red-500/30 bg-red-500/[0.06] text-red-300" : "border-emerald/30 bg-emerald/[0.06]"}`}>
          {msg === "unauthorized"
            ? "Admin access is not authorized for this login. Check ADMIN_EMAIL in Vercel, redeploy, then log out and sign in again."
            : msg}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Plan</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Access Ends</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">WhatsApp</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const status = !user.phone_number_id
                ? { text: "Not connected", cls: "muted" }
                : user.wa_registered === false
                  ? { text: "Activation pending", cls: "text-amber-300" }
                  : { text: "Connected", cls: "text-emerald" };

              return (
                <tr key={user.id} className="border-b border-line hover:bg-white/[0.03]">
                  <td className="px-4 py-3 text-sm">{user.name || "—"}</td>
                  <td className="px-4 py-3 text-sm font-mono">{user.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex rounded-full bg-emerald/20 px-2.5 py-1 text-xs font-medium text-emerald">{user.plan}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">{new Date(user.trial_ends_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={status.cls}>{status.text}</span>
                    {user.wa_registration_error && user.wa_registered === false && (
                      <p className="muted mt-1 max-w-xs text-[11px] leading-relaxed" title={user.wa_registration_error}>
                        {user.wa_registration_error.slice(0, 90)}{user.wa_registration_error.length > 90 ? "…" : ""}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => startGrant(user)} className="btn-primary px-3 py-2 text-xs">Give Plan</button>
                      <button onClick={() => startEdit(user)} className="btn-ghost px-3 py-2 text-xs">Edit</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {grantingUser && (
        <div className="mt-8 card p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-emerald">Quick paid access</p>
              <h2 className="mt-1 font-display text-lg font-semibold">Give Plan: {grantingUser.email}</h2>
              <p className="muted mt-1 text-xs">
                If the customer already has future paid access, the selected duration is added after the current expiry. Otherwise it starts today.
              </p>
            </div>
            <span className="rounded-full bg-emerald/15 px-3 py-1.5 text-xs text-emerald">Current: {grantingUser.plan}</span>
          </div>

          <div className="mt-6 max-w-sm">
            <label className="mb-1.5 block text-sm font-medium">Plan duration</label>
            <select className="field" value={grantDuration} onChange={(e) => setGrantDuration(e.target.value)}>
              {PLAN_DURATIONS.map((duration) => (
                <option key={duration.value} value={duration.value}>{duration.label}</option>
              ))}
            </select>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={givePlan} disabled={grantBusy} className="btn-primary disabled:opacity-60">
              {grantBusy ? "Activating…" : "Activate Paid Plan"}
            </button>
            <button onClick={() => setGrantingUser(null)} disabled={grantBusy} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {editingEmail && (
        <div className="mt-8 card p-6">
          <h2 className="font-display text-lg font-semibold">Advanced Edit: {editingEmail}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Plan</label>
              <select className="field" value={editForm.plan} onChange={(e) => setEditForm((f) => ({ ...f, plan: e.target.value }))}>
                <option value="trial">Trial</option>
                <option value="paid">Paid</option>
                <option value="free">Free</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Access Ends</label>
              <input type="date" className="field" value={editForm.trial_ends_at} onChange={(e) => setEditForm((f) => ({ ...f, trial_ends_at: e.target.value }))} />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={save} className="btn-primary">Save</button>
            <button onClick={() => setEditingEmail(null)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
