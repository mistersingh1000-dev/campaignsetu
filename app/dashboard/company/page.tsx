"use client";

import { useEffect, useState } from "react";

type Company = {
  name: string;
  phone: string;
  website: string;
  city: string;
  industry: string;
  address: string;
};

const empty: Company = { name: "", phone: "", website: "", city: "", industry: "", address: "" };

export default function CompanyPage() {
  const [company, setCompany] = useState<Company>(empty);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/company", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.message || "Could not load company profile");
        setCompany(data.company || empty);
      })
      .catch((e) => setError(e?.message || "Could not load company profile"));
  }, []);

  const save = async () => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const r = await fetch("/api/dashboard/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || "Could not save company profile");
      setMessage("Company profile saved ✓");
    } catch (e: any) {
      setError(e?.message || "Could not save company profile");
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof Company, label: string, placeholder: string) => (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">{label}</label>
      <input className="field" value={company[key]} onChange={(e) => setCompany((c) => ({ ...c, [key]: e.target.value }))} placeholder={placeholder} />
    </div>
  );

  return (
    <section className="px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-4xl rounded-[28px] border bg-white p-6 shadow-sm md:p-8 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald">Company Profile</p>
        <h1 className="mt-2 text-3xl font-bold">Business details</h1>
        <p className="muted mt-2 text-sm">Store workspace/company information for CRM and onboarding context. These fields do not replace Meta Business verification.</p>

        {message && <div className="mt-5 rounded-2xl border border-emerald/25 bg-emerald/[0.06] p-4 text-sm text-emerald">{message}</div>}
        {error && <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-4 text-sm text-red-400">{error}</div>}

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          {field("name", "Company name", "Your business name")}
          {field("phone", "Business phone", "+91 ...")}
          {field("website", "Website", "https://example.com")}
          {field("city", "City", "Ludhiana")}
          {field("industry", "Industry", "Retail, Services, Education...")}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold">Address</label>
            <textarea className="field min-h-28 resize-y" value={company.address} onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))} placeholder="Business address" />
          </div>
        </div>

        <button onClick={save} disabled={busy} className="btn-primary mt-6 disabled:opacity-50">{busy ? "Saving…" : "Save company profile"}</button>
      </div>
    </section>
  );
}
