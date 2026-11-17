import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "database_not_configured" }, { status: 501 });
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const enabled = Boolean(body.enabled);
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  await db.collection("users").doc(email).set({ social_publisher_enabled: enabled, updatedAt: new Date().toISOString() }, { merge: true });
  return NextResponse.json({ ok: true, email, social_publisher_enabled: enabled });
}
