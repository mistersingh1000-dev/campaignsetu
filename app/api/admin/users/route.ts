import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, listUsers, findUser, createUser } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";
import { authConfigured, newTrialEnd } from "@/lib/auth";
import { CRM_TRIAL_DAYS, crmOffer, addCalendarMonths } from "@/lib/crm-plans";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 501 });
  }

  try {
    const users = await listUsers(db);
    const safe = users.map(({ password_hash, wa_token, wa_registration_pin, ...rest }) => rest);
    return NextResponse.json({ users: safe });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "list_failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  if (req.headers.get("origin") && req.headers.get("origin") !== new URL(req.url).origin) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  if (!authConfigured()) {
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 501 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim().slice(0, 120);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const crmPlanId = String(body?.crm_plan_id || "").trim();

  if (!/^\\S+@\\S+\\.\\S+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email", message: "Enter a valid customer email address." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 200) {
    return NextResponse.json({ error: "weak_password", message: "Password must be between 8 and 200 characters." }, { status: 400 });
  }
  const offer = crmPlanId ? crmOffer(crmPlanId) : null;
  if (crmPlanId && !offer) {
    return NextResponse.json({ error: "invalid_crm_plan" }, { status: 400 });
  }

  try {
    if (await findUser(db, email)) {
      return NextResponse.json({ error: "account_exists", message: "An account with this email already exists. Find it in the customer list and use Give Plan or Edit." }, { status: 409 });
    }

    const now = new Date();
    const trialEndsAt = newTrialEnd();
    const user: any = {
      email,
      name: name || email,
      password_hash: await bcrypt.hash(password, 12),
      plan: "trial",
      trial_ends_at: trialEndsAt,
      waba_id: null,
      phone_number_id: null,
      wa_token: null,
      wa_registered: false,
      created_at: now.toISOString(),
      crm_tier: "pro",
      crm_status: "trial",
      crm_trial_ends_at: new Date(now.getTime() + CRM_TRIAL_DAYS * 86400000).toISOString(),
    };

    if (offer) {
      user.crm_tier = offer.tier;
      user.crm_status = "active";
      user.crm_cycle = offer.cycle;
      user.crm_ends_at = addCalendarMonths(now, offer.months).toISOString();
    }

    await createUser(db, user);
    const { password_hash, wa_token, wa_registration_pin, ...safe } = user;
    return NextResponse.json({ ok: true, user: safe, message: offer ? "Customer account created and CRM plan activated." : "Customer account created. Assign a plan from the customer list." }, { status: 201 });
  } catch (e: any) {
    const message = String(e?.message || "");
    if (/already exists|already-exists|ALREADY_EXISTS/i.test(message) || e?.code === 6) {
      return NextResponse.json({ error: "account_exists", message: "An account with this email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "create_failed", message: "Could not create the customer account. Please check server configuration and try again." }, { status: 500 });
  }
}
