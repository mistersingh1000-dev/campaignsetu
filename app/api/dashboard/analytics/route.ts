import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { getDb, findUser } from "@/lib/db";
import { getStats } from "@/lib/chat-db";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "no_db" }, { status: 501 });

  try {
    const user = await findUser(db, session.sub);
    if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

    const stats = await getStats(db, session.sub);

    const msLeft = new Date(user.trial_ends_at).getTime() - Date.now();
    const trialDaysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
    const connectedToWhatsApp = Boolean(user.phone_number_id) && user.wa_registered !== false;

    return NextResponse.json({
      analytics: {
        ...stats,
        trialDaysLeft,
        plan: user.plan,
        connectedToWhatsApp,
        activationPending: Boolean(user.phone_number_id) && !connectedToWhatsApp,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
