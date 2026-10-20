"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Template = {
  name: string;
  status: string;
  category: string;
  language: string;
  components?: Array<{ type?: string; text?: string }>;
};

type Campaign = {
  id: string;
  name: string;
  templateName: string;
  templateLanguage: string;
  audience?: "all_opted_in" | "tag";
  audienceTag?: string | null;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  deliveredCount: number;
  readCount: number;
  createdAt: string;
};

type Contact = {
  marketingOptIn?: boolean;
  doNotMessage?: boolean;
  tags?: string[];
};

function bodyText(template?: Template): string {
  return template?.components?.find((c) => String(c.type).toUpperCase() === "BODY")?.text || "";
}

function variableCount(template?: Template): number {
  const matches = [...bodyText(template).matchAll(/\{\{(\d+)\}\}/g)];
  return matches.reduce((max, m) => Math.max(max, Number(m[1]) || 0), 0);
}

export default function CampaignManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: "",
    templateKey: "",
    variableValues: [] as string[],
    audience: "all_opted_in" as "all_opted_in" | "tag",
    audienceTag: "",
  });

  const approvedTemplates = useMemo(
    () => templates.filter((t) => String(t.status).toUpperCase() === "APPROVED"),
    [templates]
  );
  const eligibleContacts = useMemo(
    () => contacts.filter((c) => c.marketingOptIn === true && c.doNotMessage !== true),
    [contacts]
  );
  const optedIn = eligibleContacts.length;
  const availableTags = useMemo(
    () => Array.from(new Set(eligibleContacts.flatMap((c) => c.tags || []))).sort((a, b) => a.localeCompare(b)),
    [eligibleContacts]
  );
  const audienceCount = useMemo(() => {
    if (form.audience !== "tag") return optedIn;
    const target = form.audienceTag.trim().toLowerCase();
    return eligibleContacts.filter((c) =>
      (c.tags || []).some((tag) => String(tag).trim().toLowerCase() === target)
    ).length;
  }, [eligibleContacts, form.audience, form.audienceTag, optedIn]);
  const selectedTemplate = useMemo(
    () => approvedTemplates.find((t) => `${t.name}::${t.language}` === form.templateKey),
    [approvedTemplates, form.templateKey]
  );
  const vars = variableCount(selectedTemplate);

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, cRes, contactRes] = await Promise.all([
        fetch("/api/whatsapp/templates", { cache: "no-store" }),
        fetch("/api/whatsapp/campaigns", { cache: "no-store" }),
        fetch("/api/chat/contacts", { cache: "no-store" }),
      ]);
      const [t, c, ct] = await Promise.all([
        tRes.json().catch(() => ({})),
        cRes.json().catch(() => ({})),
        contactRes.json().catch(() => ({})),
      ]);
      if (tRes.ok) setTemplates(t.templates || []);
      if (cRes.ok) setCampaigns(c.campaigns || []);
      if (contactRes.ok) setContacts(ct.contacts || []);
      setReadOnly(c?.readOnly === true || t?.readOnly === true || ct?.readOnly === true);
      if (!tRes.ok) setError(t?.message || "Templates could not be loaded. Connect WhatsApp first.");
      else if (!cRes.ok) setError(c?.message || c?.error || "Campaigns could not be loaded.");
      else if (!contactRes.ok) setError(ct?.message || ct?.error || "Contacts could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const next = Array.from({ length: vars }, (_, i) => form.variableValues[i] || (i === 0 ? "{{name}}" : ""));
    if (next.length !== form.variableValues.length) {
      setForm((f) => ({ ...f, variableValues: next }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vars, form.templateKey]);

  const createCampaign = async () => {
    if (readOnly || !selectedTemplate) return;
    setBusy("create");
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/whatsapp/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          templateName: selectedTemplate.name,
          templateLanguage: selectedTemplate.language,
          variableValues: form.variableValues,
          audience: form.audience,
          audienceTag: form.audience === "tag" ? form.audienceTag : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Could not create campaign");
      setCampaigns((rows) => [data.campaign, ...rows]);
      setShowCreate(false);
      setForm({ name: "", templateKey: "", variableValues: [], audience: "all_opted_in", audienceTag: "" });
      setSuccess("Campaign draft created ✓ Review it, then launch to the selected opted-in audience.");
    } catch (e: any) {
      setError(e?.message || "Could not create campaign");
    } finally {
      setBusy(null);
    }
  };

  const processUntilDone = async (campaignId: string, initial?: Campaign) => {
    let campaign = initial;
    for (let i = 0; i < 60; i += 1) {
      if (campaign && ["completed", "completed_with_errors", "cancelled"].includes(campaign.status)) break;
      const res = await fetch(`/api/whatsapp/campaigns/${encodeURIComponent(campaignId)}/process`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Campaign processing stopped");
      campaign = data.campaign;
      if (campaign) setCampaigns((rows) => rows.map((c) => (c.id === campaignId ? campaign! : c)));
      if (campaign && ["completed", "completed_with_errors", "cancelled"].includes(campaign.status)) break;
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
    return campaign;
  };

  const launch = async (campaignId: string) => {
    if (readOnly) return;
    setBusy(campaignId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/whatsapp/campaigns/${encodeURIComponent(campaignId)}/launch`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Could not launch campaign");
      if (data.campaign) setCampaigns((rows) => rows.map((c) => (c.id === campaignId ? data.campaign : c)));
      const finalCampaign = await processUntilDone(campaignId, data.campaign);
      setSuccess(finalCampaign?.status === "completed" ? "Campaign completed ✓" : "Campaign finished. Check failed recipients and Meta status before retrying anything.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Campaign stopped");
    } finally {
      setBusy(null);
    }
  };

  const resume = async (campaignId: string) => {
    if (readOnly) return;
    setBusy(campaignId);
    setError("");
    try {
      await processUntilDone(campaignId);
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not resume campaign");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="container-px py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Broadcast Campaigns</h1>
          <p className="muted mt-2 max-w-2xl text-sm leading-relaxed">Send Meta-approved WhatsApp templates to recorded opt-in contacts, with optional tag segmentation.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-emerald/12 px-3 py-1.5 text-emerald">{optedIn} eligible contacts</span>
            <span className="rounded-full border px-3 py-1.5" style={{ borderColor: "var(--line)" }}>{approvedTemplates.length} approved templates</span>
            <span className="rounded-full border px-3 py-1.5" style={{ borderColor: "var(--line)" }}>{availableTags.length} audience tags</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/contacts" className="btn-ghost">Manage Consent</Link>
          <Link href="/dashboard/templates" className="btn-ghost">Templates</Link>
          {!readOnly && <button onClick={() => setShowCreate((v) => !v)} className="btn-primary">{showCreate ? "Cancel" : "New Campaign"}</button>}
        </div>
      </div>

      {readOnly && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-medium text-amber-200">Campaign sending is locked</p><p className="muted mt-1 text-xs">Existing campaign history stays visible. Renew your subscription to create, launch or resume broadcasts.</p></div>
          <Link href="/pricing" className="btn-primary shrink-0 text-xs">Renew subscription</Link>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm">
        <p className="font-medium text-amber-200">Compliance protection is enabled</p>
        <p className="muted mt-1 text-xs leading-relaxed">Contacts without recorded marketing opt-in and contacts marked Do Not Message are automatically excluded. Tag segments are filtered after this consent check.</p>
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {success && <div className="mb-5 rounded-xl border border-emerald/30 bg-emerald/[0.06] p-4 text-sm text-emerald">{success}</div>}

      {showCreate && !readOnly && (
        <div className="card mb-8 p-6">
          <h2 className="font-display text-lg font-semibold">Create campaign</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-medium">Campaign name</label><input className="field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="September offer" /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Approved template</label><select className="field" value={form.templateKey} onChange={(e) => setForm((f) => ({ ...f, templateKey: e.target.value }))}><option value="">Select template</option>{approvedTemplates.map((t) => <option key={`${t.name}-${t.language}`} value={`${t.name}::${t.language}`}>{t.name} · {t.language} · {t.category}</option>)}</select></div>
            <div><label className="mb-1.5 block text-sm font-medium">Audience</label><select className="field" value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value as "all_opted_in" | "tag", audienceTag: "" }))}><option value="all_opted_in">All opted-in contacts</option><option value="tag">Opted-in contacts with a tag</option></select></div>
            {form.audience === "tag" && <div><label className="mb-1.5 block text-sm font-medium">Contact tag</label><select className="field" value={form.audienceTag} onChange={(e) => setForm((f) => ({ ...f, audienceTag: e.target.value }))}><option value="">Select tag</option>{availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select></div>}
          </div>

          {selectedTemplate && <div className="mt-5 rounded-xl border p-4" style={{ borderColor: "var(--line)" }}><p className="text-xs font-medium muted">Template preview</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{bodyText(selectedTemplate) || "Template body not returned by Meta."}</p></div>}

          {vars > 0 && <div className="mt-5"><p className="text-sm font-medium">Body variable mapping</p><p className="muted mt-1 text-xs">Use fixed text, {"{{name}}"} or {"{{phone}}"}.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{Array.from({ length: vars }, (_, i) => <div key={i}><label className="mb-1 block text-xs muted">{"{{"}{i + 1}{"}}"}</label><input className="field" value={form.variableValues[i] || ""} onChange={(e) => { const values = [...form.variableValues]; values[i] = e.target.value; setForm((f) => ({ ...f, variableValues: values })); }} placeholder={i === 0 ? "{{name}}" : "Offer text"} /></div>)}</div></div>}

          <div className="mt-5 rounded-xl bg-emerald/[0.05] p-4 text-xs leading-relaxed">Selected audience: <b>{audienceCount} opted-in contact{audienceCount === 1 ? "" : "s"}</b>{form.audience === "tag" && form.audienceTag ? ` tagged “${form.audienceTag}”` : ""}. Unconsented and Do Not Message contacts remain excluded.</div>
          <button onClick={createCampaign} disabled={busy === "create" || !form.name || !selectedTemplate || audienceCount === 0 || (form.audience === "tag" && !form.audienceTag)} className="btn-primary mt-5 disabled:opacity-50">{busy === "create" ? "Creating…" : "Create Draft"}</button>
        </div>
      )}

      {loading ? <div className="card p-10 text-center muted">Loading campaigns…</div> : campaigns.length === 0 ? <div className="card p-10 text-center"><p className="font-medium">No campaigns yet</p><p className="muted mt-2 text-sm">Add opted-in contacts, sync an approved template, then create your first campaign.</p></div> : (
        <div className="space-y-4">
          {campaigns.map((c) => {
            const progress = c.totalRecipients ? Math.round(((c.sentCount + c.failedCount) / c.totalRecipients) * 100) : 0;
            const active = ["queued", "sending"].includes(c.status);
            const label = c.audience === "tag" ? `Tag: ${c.audienceTag || "segment"}` : "All opted-in";
            return <div key={c.id} className="card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display font-semibold">{c.name}</h3><span className="rounded-full border px-2.5 py-1 text-[11px] uppercase" style={{ borderColor: "var(--line)" }}>{c.status.replaceAll("_", " ")}</span><span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] muted">{label}</span></div><p className="muted mt-1 text-xs">{c.templateName} · {c.templateLanguage}</p></div>
                {!readOnly && <div className="flex flex-wrap gap-2">{c.status === "draft" && <button disabled={busy === c.id} onClick={() => launch(c.id)} className="btn-primary text-xs disabled:opacity-50">{busy === c.id ? "Sending…" : "Launch Campaign"}</button>}{active && <button disabled={busy === c.id} onClick={() => resume(c.id)} className="btn-primary text-xs disabled:opacity-50">{busy === c.id ? "Processing…" : "Resume Sending"}</button>}</div>}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-5">{[["Recipients", c.totalRecipients],["Sent", c.sentCount],["Delivered", c.deliveredCount],["Read", c.readCount],["Failed", c.failedCount]].map(([labelName, value]) => <div key={String(labelName)} className="rounded-xl border p-3" style={{ borderColor: "var(--line)" }}><p className="muted text-[11px]">{labelName}</p><p className="mt-1 font-display text-lg font-semibold">{value}</p></div>)}</div>
              {c.totalRecipients > 0 && <div className="mt-4"><div className="mb-1 flex justify-between text-[11px] muted"><span>Processing</span><span>{Math.min(progress, 100)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-emerald transition-all" style={{ width: `${Math.min(progress, 100)}%` }} /></div></div>}
            </div>;
          })}
        </div>
      )}
    </section>
  );
}
