"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";

type Check = {
  id: string;
  label: string;
  configured: boolean;
  required: boolean;
  help: string;
};

type Health = {
  requiredReady: boolean;
  checks: Check[];
  metaApiVersion: string;
  externalMetaChecks: string[];
  trialDays?: number;
  providerMode?: boolean;
  creditLineMode?: boolean;
};

type MetaReadiness = {
  checkedAt: string;
  graphVersion: string;
  app: { configured: boolean; reachable: boolean; name: string | null; error: string | null };
  providerToken: {
    configured: boolean;
    valid: boolean | null;
    expiresAt: string | null;
    scopes: string[];
    hasBusinessManagement: boolean;
    hasWhatsAppManagement: boolean;
    hasWhatsAppMessaging: boolean;
    error: string | null;
  };
  providerBusiness: {
    configured: boolean;
    reachable: boolean | null;
    name: string | null;
    systemUserFound: boolean | null;
    error: string | null;
  };
};

export default function SystemHealth() {
  const [data, setData] = useState<Health | null>(null);
  const [meta, setMeta] = useState<MetaReadiness | null>(null);
  const [error, setError] = useState("");
  const [checkingMeta, setCheckingMeta] = useState(false);

  const loadMeta = async () => {
    setCheckingMeta(true);
    try {
      const res = await fetch("/api/admin/meta-readiness", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Could not run Meta readiness checks.");
      setMeta(body);
    } catch (e: any) {
      setError(e?.message || "Could not run Meta readiness checks.");
    } finally {
      setCheckingMeta(false);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/system-health", { cache: "no-store" }).then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || "Could not load system health.");
        return body;
      }),
      fetch("/api/admin/meta-readiness", { cache: "no-store" }).then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || "Could not load Meta readiness.");
        return body;
      }),
    ])
      .then(([health, metaHealth]) => {
        setData(health);
        setMeta(metaHealth);
      })
      .catch((e) => setError(e?.message || "Could not load system health."));
  }, []);

  if (error && !data) {
    return <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">{error}</div>;
  }
  if (!data) return <div className="muted p-4">Checking configuration…</div>;

  const required = data.checks.filter((c) => c.required);
  const optional = data.checks.filter((c) => !c.required);

  return (
    <div className="space-y-8">
      <div className={`rounded-2xl border p-5 ${data.requiredReady ? "border-emerald/40 bg-emerald/[0.06]" : "border-amber-500/40 bg-amber-500/[0.07]"}`}>
        <div className="flex items-start gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${data.requiredReady ? "bg-emerald/10 text-emerald" : "bg-amber-500/10 text-amber-300"}`}>
            {data.requiredReady ? <Icon.check className="h-5 w-5" /> : <Icon.shield className="h-5 w-5" />}
          </span>
          <div>
            <h2 className="font-display text-base font-semibold">
              {data.requiredReady ? "Core server configuration is ready" : "Some required configuration is missing"}
            </h2>
            <p className="muted mt-1 text-sm">
              Secret values are never displayed. The checks only report readiness and live Meta validation results.
            </p>
          </div>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Required for production</h2>
            <p className="muted mt-1 text-sm">Fix every Missing item before merging the production branch.</p>
          </div>
          <span className="rounded-full border px-3 py-1 text-xs muted" style={{ borderColor: "var(--line)" }}>
            Graph API {data.metaApiVersion}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {required.map((check) => <HealthCard key={check.id} check={check} />)}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Live Meta readiness</h2>
            <p className="muted mt-1 text-sm">Tests your configured Meta app and provider credentials without exposing any secret.</p>
          </div>
          <button onClick={loadMeta} disabled={checkingMeta} className="btn-ghost text-xs disabled:opacity-50">
            {checkingMeta ? "Checking Meta…" : "Run checks again"}
          </button>
        </div>

        {!meta ? (
          <div className="card p-5 muted">Meta checks are not available yet.</div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            <LiveCard
              label="Meta App"
              ok={meta.app.reachable}
              status={meta.app.reachable ? `Reachable${meta.app.name ? ` · ${meta.app.name}` : ""}` : "Not verified"}
              help={meta.app.error || "App ID and App Secret were accepted by Meta Graph API."}
            />
            <LiveCard
              label="Provider messaging token"
              ok={meta.providerToken.valid === true && meta.providerToken.hasWhatsAppMessaging}
              status={meta.providerToken.configured ? (meta.providerToken.valid ? "Valid" : "Not valid") : "Not configured"}
              help={
                meta.providerToken.error ||
                `Scopes: ${meta.providerToken.scopes.length ? meta.providerToken.scopes.join(", ") : "none returned"}`
              }
            />
            <LiveCard
              label="Provider Business / System User"
              ok={meta.providerBusiness.reachable === true && meta.providerBusiness.systemUserFound !== false}
              status={meta.providerBusiness.reachable ? `Reachable${meta.providerBusiness.name ? ` · ${meta.providerBusiness.name}` : ""}` : "Not verified"}
              help={
                meta.providerBusiness.error ||
                (meta.providerBusiness.systemUserFound === true
                  ? "Configured System User is present in the provider business."
                  : "System User membership has not been confirmed.")
              }
            />
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold">Provider-mode configuration</h2>
        <p className="muted mt-1 text-sm leading-relaxed">
          Provider settings become required when one-click multi-client provider mode is enabled. Credit-line settings stay optional unless you explicitly enable provider billing.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {optional.map((check) => <HealthCard key={check.id} check={check} />)}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-lg font-semibold">Meta approvals / real-account checks</h2>
        <p className="muted mt-1 text-sm">These cannot be fully proved from environment variables alone.</p>
        <ul className="mt-4 space-y-3">
          {data.externalMetaChecks.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm">
              <Icon.check className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function HealthCard({ check }: { check: Check }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-semibold">{check.label}</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${check.configured ? "bg-emerald/15 text-emerald" : "bg-amber-500/15 text-amber-300"}`}>
          {check.configured ? "Configured" : "Missing"}
        </span>
      </div>
      <p className="muted mt-2 text-xs leading-relaxed">{check.help}</p>
    </div>
  );
}

function LiveCard({ label, ok, status, help }: { label: string; ok: boolean; status: string; help: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-semibold">{label}</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ok ? "bg-emerald/15 text-emerald" : "bg-amber-500/15 text-amber-300"}`}>
          {ok ? "Pass" : "Check"}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium">{status}</p>
      <p className="muted mt-1.5 text-xs leading-relaxed">{help}</p>
    </div>
  );
}
