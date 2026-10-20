import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { consumePasswordResetToken } from "@/lib/password-reset";
import { consumeRateLimit, rateLimitResponse, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { token, password } = await req.json().catch(() => ({}));
  const cleanToken = String(token || "").trim();
  const newPassword = String(password || "");

  if (!/^[a-f0-9]{64}$/i.test(cleanToken)) {
    return NextResponse.json(
      { error: "invalid_token", message: "This reset link is invalid or has expired." },
      { status: 400 }
    );
  }
  if (newPassword.length < 8 || newPassword.length > 200) {
    return NextResponse.json(
      { error: "weak_password", message: "Password must be between 8 and 200 characters." },
      { status: 400 }
    );
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "database_not_configured", message: "Password reset is temporarily unavailable." },
      { status: 503 }
    );
  }

  const limit = await consumeRateLimit(
    db,
    "auth-reset-password",
    requestIp(req),
    10,
    15 * 60 * 1000
  );
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const ok = await consumePasswordResetToken(db, cleanToken, passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "invalid_or_expired", message: "This reset link is invalid, expired, or already used." },
      { status: 400 }
    );
  }

  const res = NextResponse.json({ ok: true, message: "Password updated. You can now sign in." });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
