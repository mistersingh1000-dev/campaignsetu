import { NextResponse } from "next/server";
import { getDb, findUser, normEmail } from "@/lib/db";
import { issuePasswordResetToken } from "@/lib/password-reset";
import { consumeRateLimit, rateLimitResponse, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const GENERIC_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  const cleanEmail = normEmail(email || "");

  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return NextResponse.json({ error: "invalid_email", message: "Enter a valid email address." }, { status: 400 });
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
    "auth-forgot-password",
    requestIp(req),
    5,
    15 * 60 * 1000
  );
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    return NextResponse.json(
      {
        error: "email_not_configured",
        message: "Password reset email is not configured yet. Contact the site administrator.",
      },
      { status: 503 }
    );
  }

  const user = await findUser(db, cleanEmail);
  if (!user) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  const token = await issuePasswordResetToken(db, cleanEmail);
  if (!token) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  const origin = configuredSite || new URL(req.url).origin;
  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;

  const mail = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [cleanEmail],
      subject: "Reset your WhatsApp Connect Pro password",
      text: `A password reset was requested for your WhatsApp Connect Pro account.\n\nReset your password: ${resetUrl}\n\nThis link expires in 30 minutes and can be used only once. If you did not request this, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111827"><h2>Reset your password</h2><p>A password reset was requested for your WhatsApp Connect Pro account.</p><p><a href="${resetUrl}" style="display:inline-block;background:#16c55d;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Reset password</a></p><p style="font-size:13px;color:#6b7280">This link expires in 30 minutes and can be used only once. If you did not request this, you can ignore this email.</p></div>`,
    }),
  });

  if (!mail.ok) {
    console.error("Password reset email delivery failed", mail.status);
    return NextResponse.json(
      { error: "email_send_failed", message: "Reset email could not be sent right now. Please try again shortly." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
