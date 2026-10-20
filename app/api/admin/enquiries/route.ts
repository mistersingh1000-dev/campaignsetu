import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "no_db" }, { status: 501 });

  try {
    const snap = await db.collection("enquiries").get();
    const enquiries = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    enquiries.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return NextResponse.json({ enquiries });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "no_db" }, { status: 501 });

  const { id, status } = await req.json().catch(() => ({}));
  if (!id || !["new", "contacted", "closed"].includes(status)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    await db.collection("enquiries").doc(id).update({ status });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
