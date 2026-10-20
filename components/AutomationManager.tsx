"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: "keyword" | "fallback";
  keywords: string[];
  matchMode: "contains" | "exact";
  priority: number;
  replyText: string | null;
  addTags: string[];
  runCount: number;
  lastRunAt: string | null;
};

type RuleForm = {
  name: string;
  triggerType: "keyword" | "fallback";
  keywords: string;
  matchMode: "contains" | "exact";
  priority: number;
  replyText: string;
  tags: string;
};

const emptyForm: RuleForm = {
  name: "",
  triggerType: "keyword",
  keywords: "",
  matchMode: "contains",
  priority: 100,
  replyText: "",
  tags: "",
};

export default function AutomationManager() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<RuleForm>(emptyForm);
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState<any>(null);

  const hasFallback = useMemo(() => rules.some((r) => r.triggerType === "fallback"), [rules]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/automations", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Could not load automations");
      setRules(data.rules || []);
      setReadOnly(data.readOnly === true);
    } catch (e: any) {
      setError(e?.message || "Could not load automations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetEditor = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowCreate(false);
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowCreate(true);
    setError("");
  };

  const startEdit = (rule: Rule) => {
    setEditingId(rule.id);
    setShowCreate(true);
    setForm({
      name: rule.name,
      triggerType: rule.triggerType || "keyword",
      keywords: (rule.keywords || []).join(", "),
      matchMode: rule.matchMode || "contains",
      priority: Number(rule.priority ?? 100),
      replyText: rule.replyText || "",
      tags: (rule.addTags || []).join(", "),
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const payloadFromForm = () => ({
    name: form.name,
    triggerType: form.triggerType,
    keywords: form.triggerType === "keyword"
      ? form.keywords.split(",").map((v) => v.trim()).filter(Boolean)
      : [],
    matchMode: form.matchMode,
    priority: form.priority,
    replyText: form.replyText,
    addTags: form.tags.split(",").map((v) => v.trim()).filter(Boolean),
  });

  const saveRule = async () => {
    if (readOnly) return;
    setBusy(editingId || "create");
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/automations", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ruleId: editingId, ...payloadFromForm() } : payloadFromForm()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Could not save automation");
      if (editingId) setRules((rows) => rows.map((r) => (r.id === editingId ? data.rule : r)).sort((a, b) => b.priority - a.priority));
      else setRules((rows) => [data.rule, ...rows].sort((a, b) => b.priority - a.priority));
      resetEditor();
      setSuccess(editingId ? "Automation updated ✓" : "Automation enabled ✓ It will run on matching inbound WhatsApp messages.");
    } catch (e: any) {
      setError(e?.message || "Could not save automation");
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (rule: Rule) => {
    if (readOnly) return;
    setBusy(rule.id);
    setError("");
    try {
      const res = await fetch("/api/automations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId: rule.id, enabled: !rule.enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Could not update automation");
      setRules((rows) => rows.map((r) => (r.id === rule.id ? data.rule : r)));
    } catch (e: any) {
      setError(e?.message || "Could not update automation");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (rule: Rule) => {
    if (readOnly || !window.confirm(`Delete automation “${rule.name}”?`)) return;
    setBusy(rule.id);
    setError("");
    try {
      const res = await fetch("/api/automations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId: rule.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Could not delete automation");
      setRules((rows) => rows.filter((r) => r.id !== rule.id));
      setSuccess("Automation deleted ✓");
    } catch (e: any) {
      setError(e?.message || "Could not delete automation");
    } finally {
      setBusy(null);
    }
  };

  const testAutomation = async () => {
    setBusy("test");
    setError("");
    setTestResult(null);
    try {
      const res = await fetch("/api/automations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Could not test automation");
      setTestResult(data);
    } catch (e: any) {
      setError(e?.message || "Could not test automation");
    } finally {
      setBusy(null);
    }
  };

  const canSave = form.name.trim() && form.replyText.trim() && (form.triggerType === "fallback" || form.keywords.trim());

  return (
    <section className="container-px py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">WhatsApp Chatbot & Automations</h1>
          <p className="muted mt-2 max-w-2xl text-sm leading-relaxed">Build no-code keyword replies. Higher priority rules run first; one optional fallback reply can catch messages that match nothing else.</p>
        </div>
        {!readOnly && <button onClick={showCreate ? resetEditor : startCreate} className="btn-primary">{showCreate ? "Close editor" : "New Automation"}</button>}
      </div>

      {readOnly && <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-amber-200">Automations are paused because access expired</p><p className="muted mt-1 text-xs">Existing chatbot rules stay saved and visible, but they will not reply until you activate a subscription.</p></div><Link href="/pricing" className="btn-primary shrink-0 text-xs">Choose subscription</Link></div>}

      {error && <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {success && <div className="mb-5 rounded-xl border border-emerald/30 bg-emerald/[0.06] p-4 text-sm text-emerald">{success}</div>}

      {showCreate && !readOnly && (
        <div className="card mb-8 p-6">
          <div className="flex items-center justify-between gap-4"><h2 className="font-display text-lg font-semibold">{editingId ? "Edit automation" : "Create automation"}</h2><span className="muted text-xs">Higher priority runs first</span></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-medium">Automation name</label><input className="field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Pricing enquiry" /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Trigger</label><select className="field" value={form.triggerType} onChange={(e) => setForm((f) => ({ ...f, triggerType: e.target.value as "keyword" | "fallback" }))}><option value="keyword">Keyword / phrase</option><option value="fallback" disabled={hasFallback && !editingId}>Default fallback reply</option></select></div>
            {form.triggerType === "keyword" && <div><label className="mb-1.5 block text-sm font-medium">Match type</label><select className="field" value={form.matchMode} onChange={(e) => setForm((f) => ({ ...f, matchMode: e.target.value as "contains" | "exact" }))}><option value="contains">Message contains keyword</option><option value="exact">Exact message match</option></select></div>}
            <div><label className="mb-1.5 block text-sm font-medium">Priority</label><input type="number" min={0} max={1000} className="field" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) || 0 }))} /><p className="muted mt-1 text-xs">Example: 500 runs before 100.</p></div>
          </div>
          {form.triggerType === "keyword" ? <div className="mt-4"><label className="mb-1.5 block text-sm font-medium">Keywords</label><input className="field" value={form.keywords} onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))} placeholder="price, pricing, cost, charges" /><p className="muted mt-1 text-xs">Separate multiple keywords with commas.</p></div> : <div className="mt-4 rounded-xl bg-emerald/[0.05] p-4 text-xs muted">Fallback runs only when no enabled keyword rule matches. Keep only one fallback rule.</div>}
          <div className="mt-4"><label className="mb-1.5 block text-sm font-medium">Automatic reply</label><textarea className="field min-h-32 resize-y" value={form.replyText} onChange={(e) => setForm((f) => ({ ...f, replyText: e.target.value }))} placeholder="Hi {{name}}, thanks for your message. Our plans start from..." /><p className="muted mt-1 text-xs">Use {"{{name}}"} and {"{{phone}}"} for personalization.</p></div>
          <div className="mt-4"><label className="mb-1.5 block text-sm font-medium">Add tags <span className="muted">(optional)</span></label><input className="field" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="Pricing Lead, Hot Lead" /></div>
          <div className="mt-5 flex flex-wrap gap-3"><button onClick={saveRule} disabled={busy === (editingId || "create") || !canSave} className="btn-primary disabled:opacity-50">{busy === (editingId || "create") ? "Saving…" : editingId ? "Save Changes" : "Create & Enable"}</button><button onClick={resetEditor} className="btn-ghost">Cancel</button></div>
        </div>
      )}

      <div className="card mb-8 p-6">
        <h2 className="font-display text-lg font-semibold">Test your chatbot</h2>
        <p className="muted mt-1 text-xs">Dry-run only — this does not send a WhatsApp message.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input className="field flex-1" value={testText} onChange={(e) => setTestText(e.target.value)} placeholder="Type a sample customer message, e.g. what is the price?" /><button onClick={testAutomation} disabled={!testText.trim() || busy === "test"} className="btn-ghost disabled:opacity-50">{busy === "test" ? "Testing…" : "Test Match"}</button></div>
        {testResult && <div className={`mt-4 rounded-xl border p-4 text-sm ${testResult.matched ? "border-emerald/30 bg-emerald/[0.05]" : "border-amber-500/30 bg-amber-500/[0.05]"}`}>{testResult.matched ? <><p className="font-medium">Matched: {testResult.rule?.name}</p><p className="muted mt-1 text-xs">{testResult.rule?.triggerType === "fallback" ? "Default fallback" : `Priority ${testResult.rule?.priority}`}</p><p className="mt-3 whitespace-pre-wrap">{testResult.rule?.replyText}</p></> : <p>No enabled automation matched this message.</p>}</div>}
      </div>

      {loading ? <div className="card p-10 text-center muted">Loading automations…</div> : rules.length === 0 ? <div className="card p-10 text-center"><p className="font-medium">No automation rules yet</p><p className="muted mt-2 text-sm">Create a keyword rule or default fallback to automate inbound WhatsApp responses.</p></div> : (
        <div className="space-y-4">
          {rules.map((rule) => <div key={rule.id} className="card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-display font-semibold">{rule.name}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${rule.enabled && !readOnly ? "bg-emerald/15 text-emerald" : "bg-white/5 muted"}`}>{readOnly ? "Paused by subscription" : rule.enabled ? "Enabled" : "Paused"}</span><span className="rounded-full border px-2.5 py-1 text-[11px]" style={{ borderColor: "var(--line)" }}>Priority {rule.priority ?? 100}</span>{rule.triggerType === "fallback" && <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] text-amber-200">Fallback</span>}</div>
                {rule.triggerType === "keyword" ? <p className="muted mt-2 text-xs">{rule.matchMode === "exact" ? "Exact" : "Contains"}: {(rule.keywords || []).join(", ")}</p> : <p className="muted mt-2 text-xs">Runs when no keyword rule matches.</p>}
                <p className="mt-3 whitespace-pre-wrap rounded-xl border p-3 text-sm leading-relaxed" style={{ borderColor: "var(--line)" }}>{rule.replyText}</p>
                {(rule.addTags || []).length > 0 && <p className="muted mt-2 text-xs">Adds tags: {rule.addTags.join(", ")}</p>}
                <p className="muted mt-2 text-[11px]">Runs: {rule.runCount || 0}{rule.lastRunAt ? ` · Last run ${new Date(rule.lastRunAt).toLocaleString()}` : ""}</p>
              </div>
              {!readOnly && <div className="flex flex-wrap gap-2"><button disabled={busy === rule.id} onClick={() => startEdit(rule)} className="btn-ghost text-xs">Edit</button><button disabled={busy === rule.id} onClick={() => toggle(rule)} className="btn-ghost text-xs disabled:opacity-50">{busy === rule.id ? "Saving…" : rule.enabled ? "Pause" : "Enable"}</button><button disabled={busy === rule.id} onClick={() => remove(rule)} className="btn-ghost text-xs text-red-300 disabled:opacity-50">Delete</button></div>}
            </div>
          </div>)}
        </div>
      )}
    </section>
  );
}
