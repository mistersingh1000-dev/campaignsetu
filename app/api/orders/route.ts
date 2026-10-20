import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { getDb, findUser } from "@/lib/db";
import { createOrder, pendingOrderFor, findOrderByReference } from "@/lib/orders";
import { sendEmail, customerOrderEmail, adminOrderEmail } from "@/lib/email";
import { plans, site } from "@/lib/site";
import { consumeRateLimit } from "@/lib/rate-limit";

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

export async function GET() {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "no_db" }, { status: 501 });

  try {
    const order = await pendingOrderFor(db, session.sub);
    return NextResponse.json({ pending: order });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ error: "not_authenticated", message: "Please log in first." }, { status: 401 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: "no_db" }, { status: 501 });

  const limit = await consumeRateLimit(db, "manual-payment", session.sub, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many payment submissions. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const planId = String(body.planId || "");
  const reference = String(body.reference || "").trim();
  const payerNote = String(body.note || "").trim().slice(0, 500);

  const plan = plans.find((p) => p.id === planId);
  const months = DURATION_MONTHS[planId];
  if (!plan || !months) return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(reference)) {
    return NextResponse.json(
      { error: "bad_reference", message: "Enter the transaction / UTR number exactly as shown in your payment app." },
      { status: 400 }
    );
  }

  try {
    const existing = await pendingOrderFor(db, session.sub);
    if (existing) {
      return NextResponse.json(
        { error: "already_pending", message: "You already have a payment under review. We will activate your plan shortly." },
        { status: 409 }
      );
    }

    // This lookup protects compatibility with older orders created before the
    // transactional reference-lock collection was introduced.
    const duplicateReference = await findOrderByReference(db, reference);
    if (duplicateReference) {
      return NextResponse.json(
        { error: "reference_already_used", message: "This transaction reference has already been submitted. Please check the number or contact support." },
        { status: 409 }
      );
    }

    const user = await findUser(db, session.sub);
    if (!user) return NextResponse.json({ error: "user_not_found", message: "Your account record could not be found." }, { status: 404 });

    const order = await createOrder(db, {
      userId: session.sub,
      userName: user.name || session.name || null,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      months,
      reference,
      payerNote: payerNote || null,
    });

    const adminEmail = process.env.ADMIN_EMAIL || site.email;
    const adminUrl = `${site.domain}/admin/orders`;
    const cust = customerOrderEmail({ name: order.userName, planName: order.planName, amount: order.amount, reference: order.reference });
    const adm = adminOrderEmail({ userId: order.userId, name: order.userName, planName: order.planName, amount: order.amount, reference: order.reference, note: order.payerNote, adminUrl });

    await Promise.allSettled([
      sendEmail({ to: order.userId, ...cust }),
      sendEmail({ to: adminEmail, ...adm }),
    ]);

    return NextResponse.json({ ok: true, order }, { status: 201 });
  } catch (e: any) {
    if (e?.message === "reference_already_used") {
      return NextResponse.json(
        { error: "reference_already_used", message: "This transaction reference has already been submitted." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "save_failed", message: e?.message || "Could not record your payment." }, { status: 500 });
  }
}
