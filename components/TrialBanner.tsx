"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icons";

type Me =
  | { authenticated: false }
  | {
      authenticated: true;
      name: string;
      plan: string;
      accessStatus?: string;
      trialEndsAt: string;
      accessEndsAt?: string | null;
      daysLeft: number;
      readOnly: boolean;
    };

export default function TrialBanner() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ authenticated: false }));
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (!me) return null;

  if (!me.authenticated) {
    return (
      <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-emerald/30 bg-emerald/[0.06] px-5 py-4 sm:flex-row sm:items-center">
        <p className="text-sm">
          Start a <span className="font-semibold">7-day free trial</span> to connect your own Meta WhatsApp account and test the platform.
        </p>
        <a href="/signup" className="btn-primary shrink-0 h-9 px-4 py-0 text-xs">Start 7-day trial</a>
      </div>
    );
  }

  if (me.readOnly) {
    const paidExpired = me.accessStatus === "subscription_expired";
    return (
      <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-tick/40 bg-tick/[0.06] px-5 py-4 sm:flex-row sm:items-center">
        <div className="text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Icon.shield className="h-4 w-4 text-tick" />
            {paidExpired ? "Your subscription has ended." : "Your 7-day free trial has ended."}
          </p>
          <p className="muted mt-1 text-xs leading-relaxed">
            Your WhatsApp connection and account data stay saved, but sending, campaigns, automations and new API onboarding are locked until you activate a subscription.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <a href="/pricing" className="btn-primary h-9 px-4 py-0 text-xs">Choose subscription</a>
          <button onClick={logout} className="btn-ghost h-9 px-4 py-0 text-xs">Log out</button>
        </div>
      </div>
    );
  }

  const low = me.daysLeft <= 2;
  const isTrial = me.plan === "trial";
  return (
    <div
      className={`mb-6 flex flex-col items-start justify-between gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center ${
        low ? "border-tick/40 bg-tick/[0.06]" : "border-emerald/30 bg-emerald/[0.06]"
      }`}
    >
      <div className="text-sm">
        <p className="flex items-center gap-2">
          <Icon.bolt className={`h-4 w-4 ${low ? "text-tick" : "text-emerald"}`} />
          Hi {me.name.split(" ")[0]} — {isTrial ? "your 7-day free trial" : "your subscription"} has{" "}
          <span className="font-semibold">{me.daysLeft} day{me.daysLeft === 1 ? "" : "s"}</span> left.
        </p>
        {isTrial && (
          <p className="muted mt-1 text-xs">
            Meta Embedded Signup and WhatsApp API onboarding are enabled during your trial.
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <a href="/pricing" className="btn-primary h-9 px-4 py-0 text-xs">{isTrial ? "Upgrade" : "Renew"}</a>
        <button onClick={logout} className="btn-ghost h-9 px-4 py-0 text-xs">Log out</button>
      </div>
    </div>
  );
}
