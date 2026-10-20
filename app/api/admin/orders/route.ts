import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  listOrders,
  getOrder,
  decideOrder,
  approveOrderAndExtend,
} from "@/lib/orders";
import { sendEmail, activationEmail } from "@/lib/email";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "no_db" }, { status: 501 });

  try {
    return NextResponse.json({ orders: await listOrders(db) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "no_db" }, { status: 501 });

  const { id, action } = await req.json().catch(() => ({}));
  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const order = await getOrder(db, id);
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (order.status !== "pending") {
      return NextResponse.json(
        { error: "already_decided", message: "This order was already handled." },
        { status: 409 }
      );
    }

    if (action === "reject") {
      const updated = await decideOrder(db, id, "rejected", session.sub);
      return NextResponse.json({ ok: true, order: updated });
    }

    const result = await approveOrderAndExtend(db, id, session.sub);
    if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const mail = activationEmail({
      name: result.order.userName,
      planName: result.order.planName,
      validUntil: result.validUntil,
    });
    await sendEmail({ to: result.order.userId, ...mail }).catch(() => null);

    return NextResponse.json({
      ok: true,
      order: result.order,
      validUntil: result.validUntil,
    });
  } catch (e: any) {
    if (e?.message === "already_decided") {
      return NextResponse.json(
        { error: "already_decided", message: "This order was already handled." },
        { status: 409 }
      );
    }
    if (e?.message === "user_not_found") {
      return NextResponse.json(
        { error: "user_not_found", message: "The customer account no longer exists." },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
