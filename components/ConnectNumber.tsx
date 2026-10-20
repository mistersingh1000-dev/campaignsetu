"use client";

import { useCallback, useEffect, useState } from "react";
import EmbeddedSignupButton from "./EmbeddedSignupButton";
import { Icon } from "./Icons";

type Me = {
  authenticated: boolean;
  connected?: boolean;
  activationPending?: boolean;
  readOnly?: boolean;
  accessStatus?: string;
  phoneNumberId?: string | null;
  wabaId?: string | null;
};

export default function ConnectNumber() {
  const [me, setMe] = useState<Me | null>(null);

  const load = useCallback(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  useEffect(() => load(), [load]);

  if (!me || !me.authenticated) return null;

  if (me.connected) {
    return (
      <div className="mb-6 card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald/10 text-emerald">
            <Icon.whatsapp className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold">WhatsApp API connected</p>
            <p className="muted mt-0.5 truncate text-xs">
              Phone Number ID: <span className="font-mono">{me.phoneNumberId}</span>
            </p>
          </div>
          <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${me.readOnly ? "bg-amber-500/15 text-amber-300" : "bg-emerald/12 text-emerald"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${me.readOnly ? "bg-amber-300" : "bg-emerald"}`} />
            {me.readOnly ? "Saved · subscription required" : "Connected"}
          </span>
        </div>
      </div>
    );
  }

  if (me.activationPending) {
    return (
      <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-300">
            <Icon.whatsapp className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-sm font-semibold text-amber-200">Meta signup completed — activation pending</p>
            <p className="muted mt-1 text-sm leading-relaxed">
              Meta returned your WhatsApp Business Account and phone number, but the final Cloud API registration step is still completing. Do not start another signup for the same number.
            </p>
            <p className="muted mt-2 text-xs">Phone Number ID: <span className="font-mono">{me.phoneNumberId}</span></p>
            <a href="/contact" className="mt-4 inline-flex text-sm font-medium text-emerald hover:underline">Get activation help →</a>
          </div>
        </div>
      </div>
    );
  }

  if (me.readOnly) {
    return (
      <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-base font-semibold text-amber-200">WhatsApp API onboarding is locked</p>
            <p className="muted mt-1 max-w-2xl text-sm leading-relaxed">
              Your 7-day trial or subscription has ended. Choose a subscription to start Meta Embedded Signup. Existing account data stays saved.
            </p>
          </div>
          <a href="/pricing" className="btn-primary shrink-0">Choose subscription</a>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 card p-6 sm:p-8">
      <div>
        <p className="eyebrow">Official Meta onboarding</p>
        <h3 className="font-display mt-3 text-xl font-semibold">Connect WhatsApp API</h3>
        <p className="muted mt-2 max-w-3xl text-sm leading-relaxed">
          Click Connect WhatsApp to open Meta's secure Embedded Signup popup. You can choose or create your Business Portfolio, WhatsApp Business Account and phone number inside Meta. No API token copying is required.
        </p>
      </div>

      <div className="mt-5">
        <EmbeddedSignupButton onConnected={load} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[
          ["1", "Facebook login"],
          ["2", "Business Portfolio"],
          ["3", "WhatsApp account"],
          ["4", "Phone number"],
        ].map(([step, label]) => (
          <div key={step} className="rounded-2xl border p-4" style={{ borderColor: "var(--line)" }}>
            <span className="text-xs font-semibold text-emerald">STEP {step}</span>
            <p className="mt-1 text-sm font-medium">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
