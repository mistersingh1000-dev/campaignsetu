import { NextResponse } from "next/server";
import { getDb, normEmail } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "no_db" }, { status: 503 });
  const ownerId = normEmail(admin.sub);
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (sessionId) {
    if (!sessionId.startsWith("campaignsetu_")) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    const sessionRef = db.collection("website_chat_sessions").doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists || sessionSnap.data()?.ownerId !== ownerId) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const messageSnap = await db.collection("website_chat_messages").where("sessionId", "==", sessionId).get();
    const messages = messageSnap.docs.map(d => ({ id: d.id, ...d.data() as any })).sort((a,b) => String(a.createdAt).localeCompare(String(b.createdAt))).slice(-40);
    await sessionRef.update({ unreadForAdmin: 0 });
    return NextResponse.json({ messages });
  }
  const snap = await db.collection("website_chat_sessions").where("ownerId", "==", ownerId).get();
  const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() as any }))
    .sort((a,b) => String(b.lastMessageAt).localeCompare(String(a.lastMessageAt)));
  return NextResponse.json({ sessions });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "no_db" }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.sessionId || "").slice(0, 120);
  const message = String(body.message || "").trim();
  if (!sessionId.startsWith("campaignsetu_") || !message || message.length > 2000) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const ref = db.collection("website_chat_sessions").doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.ownerId !== normEmail(admin.sub)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const now = new Date().toISOString();
  const msgRef = await db.collection("website_chat_messages").add({ sessionId, ownerId: normEmail(admin.sub), sender: "admin", text: message, createdAt: now });
  await ref.update({ lastMessage: message.slice(0,180), lastMessageAt: now, unreadForAdmin: 0, updatedAt: now });
  return NextResponse.json({ ok: true, message: { id: msgRef.id, sender: "admin", text: message, createdAt: now } });
}
