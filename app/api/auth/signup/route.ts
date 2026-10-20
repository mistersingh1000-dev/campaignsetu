import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, createSession, newTrialEnd, TRIAL_DAYS, authConfigured } from "@/lib/auth";
import { getDb, findUser, createUser, normEmail } from "@/lib/db";
import { consumeRateLimit, rateLimitResponse, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { name, email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (!authConfigured()) {
    return NextResponse.json(
      { error: "auth_not_configured", message: "Authentication is not configured on the server." },
      { status: 503 }
    );
  }

  const cleanEmail = normEmail(email);
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return NextResponse.json({ error: "invalid_email", message: "Enter a valid email address." }, { status: 400 });
  }
  if (String(password).length < 8 || String(password).length > 200) {
    return NextResponse.json(
      { error: "weak_password", message: "Password must be between 8 and 200 characters." },
      { status: 400 }
    );
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      {
        error: "database_not_configured",
        message: "Account signup is temporarily unavailable because the database is not configured.",
      },
      { status: 503 }
    );
  }

  const limit = await consumeRateLimit(db, "auth-signup", requestIp(req), 5, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  const existing = await findUser(db, cleanEmail);
  if (existing) {
    return NextResponse.json(
      { error: "account_exists", message: "An account with this email already exists. Please log in." },
      { status: 409 }
    );
  }

  const trialEndsAt = newTrialEnd();
  const password_hash = await bcrypt.hash(String(password), 12);

  try {
    await createUser(db, {
      email: cleanEmail,
      name: String(name || cleanEmail).trim().slice(0, 120),
      password_hash,
      plan: "trial",
      trial_ends_at: trialEndsAt,
      waba_id: null,
      phone_number_id: null,
      wa_token: null,
      wa_registered: false,
      created_at: new Date().toISOString(),
    });
  } catch (e: any) {
    const message = String(e?.message || "");
    if (String(e?.code || "").includes("already") || /already exists/i.test(message)) {
      return NextResponse.json(
        { error: "account_exists", message: "An account with this email already exists. Please log in." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "db_error", message: message || "Could not create the account." },
      { status: 500 }
    );
  }

  const token = await createSession({
    email: cleanEmail,
    name: String(name || cleanEmail).trim().slice(0, 120),
    plan: "trial",
    trialEndsAt,
  });
  const res = NextResponse.json({ ok: true, trialEndsAt, days: TRIAL_DAYS });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86400,
  });
  return res;
}
