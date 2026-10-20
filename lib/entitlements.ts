import type { AppUser } from "@/lib/db";

export type AccessState = {
  active: boolean;
  readOnly: boolean;
  reason: "active" | "trial_expired" | "subscription_expired" | "suspended" | "expired";
  daysLeft: number;
  accessEndsAt: string | null;
};

export function accessState(user: Pick<AppUser, "plan" | "trial_ends_at">): AccessState {
  const plan = String(user.plan || "expired").toLowerCase();
  const expiryMs = new Date(user.trial_ends_at || 0).getTime();
  const hasValidExpiry = Number.isFinite(expiryMs) && expiryMs > 0;
  const msLeft = hasValidExpiry ? expiryMs - Date.now() : -1;
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86_400_000));

  if (plan === "suspended") {
    return { active: false, readOnly: true, reason: "suspended", daysLeft: 0, accessEndsAt: user.trial_ends_at || null };
  }
  if (plan === "expired") {
    return { active: false, readOnly: true, reason: "expired", daysLeft: 0, accessEndsAt: user.trial_ends_at || null };
  }

  // Admin-assigned free accounts are intentionally non-expiring unless the
  // owner changes their plan. Trial and paid subscriptions both respect the
  // stored access end date.
  if (plan === "free") {
    return { active: true, readOnly: false, reason: "active", daysLeft, accessEndsAt: user.trial_ends_at || null };
  }

  if ((plan === "trial" || plan === "paid") && msLeft > 0) {
    return { active: true, readOnly: false, reason: "active", daysLeft, accessEndsAt: user.trial_ends_at || null };
  }

  if (plan === "trial") {
    return { active: false, readOnly: true, reason: "trial_expired", daysLeft: 0, accessEndsAt: user.trial_ends_at || null };
  }
  if (plan === "paid") {
    return { active: false, readOnly: true, reason: "subscription_expired", daysLeft: 0, accessEndsAt: user.trial_ends_at || null };
  }

  return { active: false, readOnly: true, reason: "expired", daysLeft: 0, accessEndsAt: user.trial_ends_at || null };
}

export function paidFeatureError(state: AccessState) {
  if (state.reason === "suspended") {
    return { status: 403, error: "suspended", message: "This account is suspended. Contact support." };
  }
  if (state.reason === "trial_expired") {
    return { status: 402, error: "trial_expired", message: "Your 7-day free trial has ended. Choose a subscription to continue using WhatsApp API features." };
  }
  if (state.reason === "subscription_expired") {
    return { status: 402, error: "subscription_expired", message: "Your subscription has ended. Renew a plan to continue using WhatsApp API features." };
  }
  return { status: 402, error: "access_expired", message: "Your account access has ended. Choose a subscription to continue." };
}
