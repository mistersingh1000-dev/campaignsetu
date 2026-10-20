"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type MetaTemplate = {
  id?: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components?: Array<{ type?: string; text?: string }>;
};

export default function TemplateManager() {
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "MARKETING",
    language: "en_US",
    body: "",
    footer: "",
  });

  const approved = useMemo(
    () => templates.filter((t) => String(t.status).toUpperCase() === "APPROVED").length,
    [templates]
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/whatsapp/templates", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Could not load templates");
      setTemplates(data.templates || []);
      setReadOnly(data.readOnly === true);
    } catch (e: any) {
      setError(e?.message || "Could not load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createTemplate = async () => {
    if (readOnly) return;
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Could not create template");
      setSuccess("Template submitted to Meta ✓ Approval status will appear after refresh.");
      setForm({ name: "", category: "MARKETING", language: "en_US", body: "", footer: "" });
      setShowCreate(false);
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not create template");
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="container-px py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">WhatsApp Templates</h1>
          <p className="muted mt-2 max-w-2xl text-sm leading-relaxed">
            Sync approved message templates directly from Meta. Business-initiated campaigns use approved templates instead of unrestricted free-form text.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border px-3 py-1.5" style={{ borderColor: "var(--line)" }}>{templates.length} total</span>
            <span className="rounded-full bg-emerald/12 px-3 py-1.5 text-emerald">{approved} approved</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="btn-ghost" disabled={loading}>Refresh from Meta</button>
          {!readOnly && (
            <button onClick={() => setShowCreate((v) => !v)} className="btn-primary">
              {showCreate ? "Cancel" : "Create Template"}
            </button>
          )}
        </div>
      </div>

      {readOnly && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-amber-200">Template management is read-only</p>
            <p className="muted mt-1 text-xs">Your existing Meta templates stay visible. Renew or subscribe to create templates and send campaigns.</p>
          </div>
          <Link href="/pricing" className="btn-primary shrink-0 text-xs">Choose subscription</Link>
        </div>
      )}

      {error && <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {success && <div className="mb-5 rounded-xl border border-emerald/30 bg-emerald/[0.06] p-4 text-sm text-emerald">{success}</div>}

      {showCreate && !readOnly && (
        <div className="card mb-8 p-6">
          <h2 className="font-display text-lg font-semibold">Submit a simple template to Meta</h2>
          <p className="muted mt-1 text-xs leading-relaxed">Meta reviews the template. Submission does not guarantee approval. Use clear, policy-compliant wording.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Template name</label>
              <input className="field font-mono" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))} placeholder="offer_followup" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Category</label>
              <select className="field" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                <option value="MARKETING">Marketing</option><option value="UTILITY">Utility</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Language</label>
              <select className="field" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}>
                <option value="en_US">English (US)</option><option value="en">English</option><option value="hi">Hindi</option><option value="pa">Punjabi</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Footer <span className="muted">(optional)</span></label>
              <input className="field" value={form.footer} onChange={(e) => setForm((f) => ({ ...f, footer: e.target.value }))} maxLength={60} placeholder="Reply STOP to opt out" />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium">Message body</label>
            <textarea className="field min-h-32 resize-y" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} maxLength={1024} placeholder="Hi {{1}}, we have an update for you..." />
            <p className="muted mt-1 text-xs">Variables such as {"{{1}}"}, {"{{2}}"} can be mapped when creating a campaign.</p>
          </div>
          <button disabled={creating || !form.name || !form.body} onClick={createTemplate} className="btn-primary mt-5 disabled:opacity-50">{creating ? "Submitting to Meta…" : "Submit for Meta Review"}</button>
        </div>
      )}

      {loading ? (
        <div className="card p-10 text-center muted">Loading templates from Meta…</div>
      ) : templates.length === 0 ? (
        <div className="card p-10 text-center"><p className="font-medium">No templates returned by Meta</p><p className="muted mt-2 text-sm">Create a template here or in WhatsApp Manager, then refresh.</p></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {templates.map((t) => {
            const body = t.components?.find((c) => String(c.type).toUpperCase() === "BODY")?.text;
            const status = String(t.status || "UNKNOWN").toUpperCase();
            const ok = status === "APPROVED";
            return (
              <div key={`${t.id || t.name}-${t.language}`} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-mono text-sm font-semibold">{t.name}</p><p className="muted mt-1 text-xs">{t.category} · {t.language}</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ok ? "bg-emerald/15 text-emerald" : "bg-amber-500/15 text-amber-300"}`}>{status}</span>
                </div>
                {body && <p className="mt-4 whitespace-pre-wrap rounded-xl border p-3 text-sm leading-relaxed" style={{ borderColor: "var(--line)" }}>{body}</p>}
                {ok && !readOnly && <Link href="/dashboard/campaigns" className="mt-4 inline-flex text-sm font-medium text-emerald hover:underline">Use in campaign →</Link>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
