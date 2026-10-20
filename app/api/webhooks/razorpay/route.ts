import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { activateRazorpayOrder, getRazorpayOrder } from "@/lib/razorpay-payments";
import { activationEmail, sendEmail } from "@/lib/email";

export const runtime = "nodejs";

function validSignature(raw: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-razorpay-signature"), secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

  const body = JSON.parse(raw || "{}");
  const event = String(body?.event || "");
  if (!["payment.captured", "order.paid"].includes(event)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payment = body?.payload?.payment?.entity;
  const orderId = String(payment?.order_id || body?.payload?.order?.entity?.id || "");
  const paymentId = String(payment?.id || "");
  if (!orderId || !paymentId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const stored = await getRazorpayOrder(db, orderId);
  if (!stored) {
    // A webhook can arrive before our order record write finishes. Return 500 so
    // Razorpay retries instead of permanently dropping a legitimate payment.
    return NextResponse.json({ error: "order_not_found" }, { status: 500 });
  }

  if (
    Number(payment?.amount) !== stored.amountPaise ||
    String(payment?.currency || "").toUpperCase() !== stored.currency ||
    String(payment?.status || "") !== "captured"
  ) {
    return NextResponse.json({ error: "payment_details_mismatch" }, { status: 400 });
  }

  try {
    const activated = await activateRazorpayOrder(db, orderId, paymentId, "webhook");
    if (!activated) return NextResponse.json({ error: "order_not_found" }, { status: 500 });

    if (!activated.alreadyPaid) {
      const mail = activationEmail({
        name: activated.record.userName,
        planName: activated.record.planName,
        validUntil: activated.validUntil,
      });
      await sendEmail({ to: activated.record.userId, ...mail }).catch(() => null);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Razorpay webhook activation failed", e?.message || e);
    return NextResponse.json({ error: "activation_failed" }, { status: 500 });
  }
}
