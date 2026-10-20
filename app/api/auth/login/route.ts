import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, createSession } from "@/lib/auth";
import { getDb, findUser, normEmail } from "@/lib/db";
import { accessState } from "@/lib/entitlements";
import { consumeRateLimit, rateLimitResponse, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "no_db", message: "Login needs a database. Add FIREBASE_SERVICE_ACCOUNT in Vercel to enable it." },
      { status: 501 }
    );
  }

  const cleanEmail = normEmail(email);
  const limit = await consumeRateLimit(
    db,
    "auth-login",
    `${requestIp(req)}:${cleanEmail}`,
    10,
    15 * 60 * 1000
  );
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  const user = await findUser(db, cleanEmail);
  if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
    return NextResponse.json(
      { error: "invalid", message: "Incorrect email or password." },
      { status: 401 }
    );
  }

  if (user.plan === "suspended") {
    return NextResponse.json(
      { error: "suspended", message: "This account is suspended. Contact support." },
      { status: 403 }
    );
  }

  const access = accessState(user);
  const plan = access.active
    ? (user.plan as "trial" | "free" | "paid")
    : "expired";

  const token = await createSession({
    email: user.email,
    name: user.name || user.email,
    plan,
    trialEndsAt: user.trial_ends_at,
  });
  const res = NextResponse.json({
    ok: true,
    plan,
    readOnly: access.readOnly,
    accessStatus: access.reason,
    daysLeft: access.daysLeft,
  });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86400,
  });
  return res;
}
