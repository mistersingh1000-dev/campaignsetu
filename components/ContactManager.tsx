"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Contact = {
  id: string;
  phone: string;
  name: string | null;
  email?: string | null;
  company?: string | null;
  city?: string | null;
  tags?: string[];
  marketingOptIn?: boolean;
  optInSource?: string | null;
  doNotMessage?: boolean;
};

type ImportRow = {
  phone: string;
  name?: string;
  email?: string;
  company?: string;
  city?: string;
  tags?: string;
  marketingOptIn?: boolean;
  optInSource?: string;
  doNotMessage?: boolean;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field.trim());
      field = "";
    } else if (ch === "\n") {
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function csvToContacts(text: string): ImportRow[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s_-]+/g, ""));
  const index = (names: string[]) => headers.findIndex((h) => names.includes(h));
  const phoneIndex = index(["phone", "phonenumber", "whatsapp", "whatsappnumber", "mobile"]);
  if (phoneIndex < 0) throw new Error("CSV must contain a phone column.");

  const nameIndex = index(["name", "customername", "contactname"]);
  const emailIndex = index(["email"]);
  const companyIndex = index(["company", "business"]);
  const cityIndex = index(["city", "location"]);
  const tagsIndex = index(["tags", "tag"]);
  const optInIndex = index(["marketingoptin", "optin", "consent"]);
  const optInSourceIndex = index(["optinsource", "consentsource"]);
  const dnmIndex = index(["donotmessage", "dnm", "blocked"]);
  const truthy = (value: string) => ["true", "yes", "1", "y"].includes(String(value || "").trim().toLowerCase());

  return rows.slice(1).map((r) => ({
    phone: r[phoneIndex] || "",
    name: nameIndex >= 0 ? r[nameIndex] : undefined,
    email: emailIndex >= 0 ? r[emailIndex] : undefined,
    company: companyIndex >= 0 ? r[companyIndex] : undefined,
    city: cityIndex >= 0 ? r[cityIndex] : undefined,
    tags: tagsIndex >= 0 ? r[tagsIndex] : undefined,
    marketingOptIn: optInIndex >= 0 ? truthy(r[optInIndex]) : false,
    optInSource: optInSourceIndex >= 0 ? r[optInSourceIndex] : undefined,
    doNotMessage: dnmIndex >= 0 ? truthy(r[dnmIndex]) : false,
  }));
}

export default function ContactManager() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [readOnly, setReadOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const optedInCount = useMemo(
    () => contacts.filter((c) => c.marketingOptIn === true && c.doNotMessage !== true).length,
    [contacts]
  );

  const allTags = useMemo(
    () => Array.from(new Set(contacts.flatMap((c) => c.tags || []))).sort((a, b) => a.localeCompare(b)),
    [contacts]
  );

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chat/contacts", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Failed to load contacts");
      setContacts(data.contacts || []);
      setReadOnly(data.readOnly === true);
    } catch (e: any) {
      setError(e?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const addContact = async () => {
    if (readOnly) return;
    setError("");
    if (!phone.trim()) {
      setError("Phone number is required");
      return;
    }

    try {
      const res = await fetch("/api/chat/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name: name || null,
          marketingOptIn,
          optInSource: marketingOptIn ? "owner-confirmed consent" : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Failed to add contact");

      setContacts((rows) => [data.contact, ...rows.filter((c) => c.id !== data.contact.id)]);
      setPhone("");
      setName("");
      setMarketingOptIn(false);
      setShowForm(false);
      setSuccess("Contact saved ✓");
      window.setTimeout(() => setSuccess(""), 2500);
    } catch (e: any) {
      setError(e?.message || "Error adding contact");
    }
  };

  const setConsent = async (contact: Contact, value: boolean) => {
    if (readOnly) return;
    setSavingId(contact.id);
    setError("");
    try {
      const res = await fetch("/api/chat/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          marketingOptIn: value,
          optInSource: value ? "owner-confirmed consent" : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Could not update consent");
      setContacts((rows) => rows.map((c) => (c.id === contact.id ? data.contact : c)));
    } catch (e: any) {
      setError(e?.message || "Could not update consent");
    } finally {
      setSavingId(null);
    }
  };

  const pickCsv = async (file?: File) => {
    if (!file) return;
    setError("");
    try {
      const text = await file.text();
      const rows = csvToContacts(text);
      if (!rows.length) throw new Error("No contact rows were found in this CSV.");
      setImportRows(rows.slice(0, 500));
      setImportFileName(file.name);
    } catch (e: any) {
      setImportRows([]);
      setImportFileName("");
      setError(e?.message || "Could not read CSV file.");
    }
  };

  const importCsv = async () => {
    if (readOnly || !importRows.length) return;
    setImporting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/chat/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: importRows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Could not import contacts");
      setSuccess(`Import complete ✓ ${data.imported || 0} saved, ${data.skipped || 0} skipped.`);
      setImportRows([]);
      setImportFileName("");
      setShowImport(false);
      await loadContacts();
    } catch (e: any) {
      setError(e?.message || "Could not import contacts");
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <div className="p-10 text-center muted">Loading contacts…</div>;

  return (
    <div className="container-px py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Contacts & Consent</h1>
          <p className="muted mt-2 max-w-2xl text-sm leading-relaxed">
            Manage customer numbers, consent and tags for compliant WhatsApp broadcasts and automations.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border px-3 py-1.5" style={{ borderColor: "var(--line)" }}>{contacts.length} total contacts</span>
            <span className="rounded-full bg-emerald/12 px-3 py-1.5 text-emerald">{optedInCount} marketing opted-in</span>
            <span className="rounded-full border px-3 py-1.5" style={{ borderColor: "var(--line)" }}>{allTags.length} tags</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/campaigns" className="btn-ghost">Campaigns</Link>
          {!readOnly && (
            <>
              <button onClick={() => { setShowImport((v) => !v); setShowForm(false); }} className="btn-ghost">Import CSV</button>
              <button onClick={() => { setShowForm((v) => !v); setShowImport(false); }} className="btn-primary">{showForm ? "Cancel" : "Add Contact"}</button>
            </>
          )}
        </div>
      </div>

      {readOnly && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-amber-200">Contacts are read-only</p>
            <p className="muted mt-1 text-xs">Your CRM data and consent history stay saved. Subscribe or renew to add/edit contacts and run campaigns.</p>
          </div>
          <Link href="/pricing" className="btn-primary shrink-0 text-xs">Choose subscription</Link>
        </div>
      )}

      {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      {success && <div className="mb-4 rounded-xl border border-emerald/30 bg-emerald/[0.06] p-3 text-sm text-emerald">{success}</div>}

      {showImport && !readOnly && (
        <div className="card mb-8 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Bulk import contacts</h2>
              <p className="muted mt-2 max-w-2xl text-xs leading-relaxed">
                CSV headers supported: phone, name, email, company, city, tags, marketingOptIn, optInSource, doNotMessage. Separate multiple tags with | or ;. A contact is marketing-eligible only when marketingOptIn is explicitly true/yes/1 and Do Not Message is not set.
              </p>
            </div>
            <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">Max 500 rows per import</span>
          </div>
          <label className="mt-5 block rounded-2xl border border-dashed p-6 text-center" style={{ borderColor: "var(--line)" }}>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void pickCsv(e.target.files?.[0])} />
            <span className="text-sm font-medium">Choose CSV file</span>
            <span className="muted mt-1 block text-xs">{importFileName || "No file selected"}</span>
          </label>
          {importRows.length > 0 && (
            <div className="mt-4 rounded-xl bg-emerald/[0.05] p-4 text-xs">
              Ready to import <b>{importRows.length}</b> rows · <b>{importRows.filter((r) => r.marketingOptIn && !r.doNotMessage).length}</b> rows explicitly marked marketing opt-in.
            </div>
          )}
          <div className="mt-5 flex gap-3">
            <button onClick={importCsv} disabled={importing || !importRows.length} className="btn-primary disabled:opacity-50">{importing ? "Importing…" : "Import Contacts"}</button>
            <button onClick={() => { setShowImport(false); setImportRows([]); setImportFileName(""); }} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {showForm && !readOnly && (
        <div className="card mb-8 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Phone Number</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" className="field" />
              <p className="muted mt-1 text-xs">Use international format.</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" className="field" />
            </div>
          </div>

          <label className="mt-5 flex items-start gap-3 rounded-2xl border p-4" style={{ borderColor: "var(--line)" }}>
            <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} className="mt-1" />
            <span>
              <span className="block text-sm font-medium">Customer has agreed to receive WhatsApp marketing messages</span>
              <span className="muted mt-1 block text-xs leading-relaxed">Only enable this when you have a valid opt-in/consent record. Campaigns automatically exclude contacts without consent.</span>
            </span>
          </label>

          <button onClick={addContact} className="btn-primary mt-5 w-full sm:w-auto">Save Contact</button>
        </div>
      )}

      <div className="space-y-3">
        {contacts.map((contact) => {
          const eligible = contact.marketingOptIn === true && contact.doNotMessage !== true;
          return (
            <div key={contact.id} className="card p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium">{contact.name || contact.phone}</p>
                  <p className="muted mt-0.5 font-mono text-xs">{contact.phone}</p>
                  {(contact.company || contact.city) && <p className="muted mt-1 text-xs">{[contact.company, contact.city].filter(Boolean).join(" · ")}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${eligible ? "bg-emerald/15 text-emerald" : "bg-amber-500/15 text-amber-300"}`}>
                      {eligible ? "Marketing opt-in ✓" : "Not eligible for campaigns"}
                    </span>
                    {contact.doNotMessage && <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-medium text-red-300">Do not message</span>}
                    {(contact.tags || []).map((tag) => <span key={tag} className="rounded-full border px-2.5 py-1 text-[11px]" style={{ borderColor: "var(--line)" }}>{tag}</span>)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!readOnly && !contact.doNotMessage && (
                    <button disabled={savingId === contact.id} onClick={() => setConsent(contact, !eligible)} className="btn-ghost text-xs disabled:opacity-50">
                      {savingId === contact.id ? "Saving…" : eligible ? "Remove marketing opt-in" : "Confirm marketing opt-in"}
                    </button>
                  )}
                  <Link href="/dashboard/chat" className="btn-ghost text-xs">Open Inbox</Link>
                </div>
              </div>
            </div>
          );
        })}

        {contacts.length === 0 && (
          <div className="card p-12 text-center"><p className="text-lg font-medium">No contacts yet</p><p className="muted mt-2 text-sm">Add a contact, import a CSV, or receive an inbound WhatsApp conversation.</p></div>
        )}
      </div>
    </div>
  );
}
