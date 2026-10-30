import { NextResponse } from "next/server";
import { getDb, updateUser } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { crmOffer, addCalendarMonths } from "@/lib/crm-plans";

export const runtime = "nodejs";

const ALLOWED_PLANS = new Set(["trial", "paid", "free", "expired", "suspended"]);

export async function PATCH(req: Request, { params }: any) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 501 });
  }

  const resolvedParams = await params;
  const email = String(resolvedParams?.email || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email_required" }, { status: 400 });

  if (req.headers.get("origin") && req.headers.get("origin") !== new URL(req.url).origin) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const { plan, trial_ends_at, crm_plan_id } = await req.json().catch(() => ({}));
  if (crm_plan_id !== undefined) {
    const offer = crmOffer(String(crm_plan_id));
    if (!offer || plan !== undefined || trial_ends_at !== undefined) return NextResponse.json({ error: "invalid_crm_grant" }, { status: 400 });
    try {
      const user = await updateUser(db, email, { crm_tier: offer.tier, crm_status: "active", crm_cycle: offer.cycle, crm_ends_at: addCalendarMonths(new Date(), offer.months).toISOString() });
      if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
      const { password_hash, wa_token, wa_registration_pin, ...safe } = user;
      return NextResponse.json({ ok: true, user: safe });
    } catch { return NextResponse.json({ error: "crm_grant_failed" }, { status: 500 }); }
  }
  const updates: Record<string, string> = {};

  if (plan !== undefined) {
    const cleanPlan = String(plan).trim().toLowerCase();
    if (!ALLOWED_PLANS.has(cleanPlan)) {
      return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
    }
    updates.plan = cleanPlan;
  }

  if (trial_ends_at !== undefined) {
    const parsed = new Date(String(trial_ends_at));
    if (!Number.isFinite(parsed.getTime())) {
      return NextResponse.json({ error: "invalid_access_end" }, { status: 400 });
    }
    updates.trial_ends_at = parsed.toISOString();
  }

  if (updates.plan === "paid") {
    const accessEnd = updates.trial_ends_at ? new Date(updates.trial_ends_at).getTime() : NaN;
    if (!Number.isFinite(accessEnd) || accessEnd <= Date.now()) {
      return NextResponse.json(
        { error: "paid_plan_requires_future_access_end" },
        { status: 400 }
      );
    }
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  try {
    const user = await updateUser(db, email, updates);
    if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    const { password_hash, wa_token, wa_registration_pin, ...safe } = user;
    return NextResponse.json({ ok: true, user: safe });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "update_failed" }, { status: 500 });
  }
}
