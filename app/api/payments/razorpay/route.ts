import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { findUser, getDb } from "@/lib/db";
import { plans } from "@/lib/site";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  activateRazorpayOrder,
  getRazorpayOrder,
  saveRazorpayOrder,
} from "@/lib/razorpay-payments";
import { activationEmail, sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const DURATION_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  halfyear: 6,
  yearly: 12,
  "3year": 36,
  "5year": 60,
  "10year": 120,
  lifetime: 1200,
};

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return keyId && keySecret ? { keyId, keySecret } : null;
}

function basicAuth(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

function validSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function sessionContext() {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) return null;
  const db = getDb();
  if (!db) return null;
  const user = await findUser(db, session.sub);
  if (!user) return null;
  return { session, db, user };
}

export async function POST(req: Request) {
  const ctx = await sessionContext();
  if (!ctx) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const creds = credentials();
  if (!creds) {
    return NextResponse.json(
      {
        error: "razorpay_not_configured",
        message: "Online checkout is not configured yet. You can use the manual UPI option.",
      },
      { status: 501 }
    );
  }

  const limit = await consumeRateLimit(ctx.db, "razorpay-create-order", ctx.session.sub, 20, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many checkout attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const { planId } = await req.json().catch(() => ({}));
  const plan = plans.find((p) => p.id === String(planId || ""));
  const months = plan ? DURATION_MONTHS[plan.id] : 0;
  if (!plan || !months) return NextResponse.json({ error: "invalid_plan" }, { status: 400 });

  const amountPaise = Math.round(plan.price * 100);
  const receipt = `wcp_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;

  const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: basicAuth(creds.keyId, creds.keySecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: { plan_id: plan.id },
    }),
    cache: "no-store",
  });
  const order = await orderRes.json().catch(() => ({}));
  if (!orderRes.ok || !order?.id) {
    return NextResponse.json(
      {
        error: "razorpay_order_failed",
        message: order?.error?.description || "Could not start secure checkout.",
      },
      { status: 502 }
    );
  }

  await saveRazorpayOrder(ctx.db, {
    id: String(order.id),
    userId: ctx.session.sub,
    userName: ctx.user.name || null,
    planId: plan.id,
    planName: plan.name,
    amountPaise,
    currency: "INR",
    months,
    status: "created",
    paymentId: null,
    createdAt: new Date().toISOString(),
    paidAt: null,
    validUntil: null,
    activationSource: null,
  });

  return NextResponse.json({
    ok: true,
    keyId: creds.keyId,
    orderId: String(order.id),
    amount: amountPaise,
    currency: "INR",
    planName: plan.name,
    customer: { name: ctx.user.name || "", email: ctx.user.email },
  });
}

export async function PUT(req: Request) {
  const ctx = await sessionContext();
  if (!ctx) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const creds = credentials();
  if (!creds) return NextResponse.json({ error: "razorpay_not_configured" }, { status: 501 });

  const body = await req.json().catch(() => ({}));
  const orderId = String(body.razorpay_order_id || "").trim();
  const paymentId = String(body.razorpay_payment_id || "").trim();
  const signature = String(body.razorpay_signature || "").trim();
  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "missing_payment_proof" }, { status: 400 });
  }

  if (!validSignature(orderId, paymentId, signature, creds.keySecret)) {
    return NextResponse.json({ error: "invalid_payment_signature" }, { status: 400 });
  }

  const stored = await getRazorpayOrder(ctx.db, orderId);
  if (!stored || stored.userId !== ctx.session.sub) {
    return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  }

  if (stored.status === "paid") {
    return NextResponse.json({ ok: true, alreadyPaid: true, validUntil: stored.validUntil });
  }

  const paymentRes = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: { Authorization: basicAuth(creds.keyId, creds.keySecret) },
      cache: "no-store",
    }
  );
  const payment = await paymentRes.json().catch(() => ({}));
  if (!paymentRes.ok) {
    return NextResponse.json(
      { error: "payment_verification_failed", message: "Could not verify the payment with Razorpay." },
      { status: 502 }
    );
  }

  const matches =
    String(payment.order_id || "") === orderId &&
    Number(payment.amount) === stored.amountPaise &&
    String(payment.currency || "").toUpperCase() === stored.currency;
  if (!matches) {
    return NextResponse.json({ error: "payment_details_mismatch" }, { status: 400 });
  }
  if (String(payment.status) !== "captured") {
    return NextResponse.json(
      {
        error: "payment_not_captured",
        message: "Payment is not captured yet. Please wait a moment and refresh your dashboard.",
      },
      { status: 409 }
    );
  }

  try {
    const activated = await activateRazorpayOrder(ctx.db, orderId, paymentId, "browser");
    if (!activated) return NextResponse.json({ error: "order_not_found" }, { status: 404 });

    if (!activated.alreadyPaid) {
      const mail = activationEmail({
        name: activated.record.userName,
        planName: activated.record.planName,
        validUntil: activated.validUntil,
      });
      await sendEmail({ to: activated.record.userId, ...mail }).catch(() => null);
    }

    return NextResponse.json({
      ok: true,
      alreadyPaid: activated.alreadyPaid,
      validUntil: activated.validUntil,
      planName: activated.record.planName,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "activation_failed" }, { status: 500 });
  }
}
