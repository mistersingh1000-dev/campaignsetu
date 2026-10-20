"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [me, setMe] = useState<any>(null);
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json()).then(setMe).catch(() => setMe(null));
  }, []);

  return (
    <section className="px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-3xl rounded-[28px] border bg-white p-6 shadow-sm md:p-8 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald">Profile</p>
        <h1 className="mt-2 text-3xl font-bold">My account</h1>
        <p className="muted mt-2 text-sm">Your signed-in Codecraft Messaging Hub account details.</p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border p-5 dark:border-white/10"><p className="muted text-xs">Name</p><p className="mt-1 font-semibold">{me?.name || "—"}</p></div>
          <div className="rounded-2xl border p-5 dark:border-white/10"><p className="muted text-xs">Email</p><p className="mt-1 break-all font-semibold">{me?.email || "—"}</p></div>
          <div className="rounded-2xl border p-5 dark:border-white/10"><p className="muted text-xs">Plan</p><p className="mt-1 font-semibold capitalize">{me?.plan || "—"}</p></div>
          <div className="rounded-2xl border p-5 dark:border-white/10"><p className="muted text-xs">WhatsApp</p><p className="mt-1 font-semibold">{me?.connected ? "Connected" : me?.activationPending ? "Activation pending" : "Not connected"}</p></div>
        </div>

        <div className="mt-6 rounded-2xl border border-emerald/25 bg-emerald/[0.05] p-5 text-sm">
          For account security, never send your Facebook password, OTP, WhatsApp OTP, Meta access token or banking PIN through support messages.
        </div>
      </div>
    </section>
  );
}
