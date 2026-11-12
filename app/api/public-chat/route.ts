import { NextResponse } from "next/server";
import { getDb, normEmail } from "@/lib/db";
import { consumeRateLimit, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

function safeVisitorId(value: unknown): string {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

export async function GET(req: Request) {
  const visitorId = safeVisitorId(new URL(req.url).searchParams.get("visitorId"));
  if (!visitorId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const id = `campaignsetu_${visitorId}`;
  const session = await db.collection("website_chat_sessions").doc(id).get();
  if (!session.exists) return NextResponse.json({ messages: [] });
  const snap = await db.collection("website_chat_messages").where("sessionId", "==", id).get();
  const messages = snap.docs.map(d => ({ id: d.id, ...d.data() as any }))
    .sort((a,b) => String(a.createdAt).localeCompare(String(b.createdAt))).slice(-40);
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > 8_192) return NextResponse.json({ error: "too_large" }, { status: 413 });
  let body: any;
  try { body = JSON.parse(raw || "{}"); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  if (String(body.website || "").trim()) return NextResponse.json({ ok: true }); // honeypot
  const visitorId = safeVisitorId(body.visitorId);
  const message = String(body.message || "").trim();
  const name = String(body.name || "").trim().slice(0, 80);
  const email = String(body.email || "").trim().slice(0, 254);
  if (!visitorId || !message || message.length > 2000) return NextResponse.json({ error: "bad_request", message: "Please enter a message (up to 2,000 characters)." }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "invalid_email", message: "Please check your email address." }, { status: 400 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "unavailable", message: "Chat is temporarily unavailable. Please use the contact page." }, { status: 503 });
  const limit = await consumeRateLimit(db, "public-website-chat", requestIp(req), 12, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "rate_limited", message: "Please wait a while before sending another message." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  const ownerId = normEmail(process.env.ADMIN_EMAIL || "");
  if (!ownerId) return NextResponse.json({ error: "not_configured", message: "Support chat is not configured yet." }, { status: 503 });
  const sessionId = `campaignsetu_${visitorId}`;
  const now = new Date().toISOString();
  const sessionRef = db.collection("website_chat_sessions").doc(sessionId);
  await db.runTransaction(async tx => {
    const old = await tx.get(sessionRef);
    tx.set(sessionRef, {
      ownerId, visitorId, name: name || (old.exists ? old.data()?.name : null) || null,
      email: email || (old.exists ? old.data()?.email : null) || null,
      status: "open", lastMessage: message.slice(0, 180), lastMessageAt: now,
      unreadForAdmin: (Number(old.data()?.unreadForAdmin) || 0) + 1,
      createdAt: old.exists ? old.data()?.createdAt : now, updatedAt: now,
    }, { merge: true });
  });
  const ref = await db.collection("website_chat_messages").add({ sessionId, ownerId, sender: "visitor", text: message, createdAt: now });

  // Approved answers only: use explicit admin-maintained phrases, never a generated answer.
  const knowledge = await db.collection("approved_knowledge").where("ownerId", "==", ownerId).where("active", "==", true).get();
  const normalized = message.toLowerCase().replace(/[^a-z0-9\\s]/g, " ").replace(/\\s+/g, " ").trim();
  const matched = knowledge.docs.find(doc => {
    const keywords = Array.isArray(doc.data().keywords) ? doc.data().keywords : [];
    return keywords.some((raw: unknown) => {
      const phrase = String(raw || "").toLowerCase().trim();
      return phrase.length >= 3 && normalized.includes(phrase);
    });
  });
  if (matched) {
    const approvedText = String(matched.data().answer || "").slice(0, 3000);
    const autoRef = await db.collection("website_chat_messages").add({
      sessionId, ownerId, sender: "admin", text: approvedText, source: "approved-knowledge",
      knowledgeId: matched.id, createdAt: new Date().toISOString(),
    });
    await sessionRef.set({ lastMessage: approvedText.slice(0,180), lastMessageAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
    return NextResponse.json({ ok: true, message: { id: ref.id, sender: "visitor", text: message, createdAt: now }, autoReply: { id: autoRef.id, sender: "admin", text: approvedText } }, { status: 201 });
  }

  // Unknown questions are queued for human review. The suggested text is an internal
  // starter draft only; it is deliberately not sent to the visitor.
  await db.collection("ai_question_approvals").add({
    ownerId, channel: "website", sessionId, question: message,
    suggestedAnswer: "Thanks for your question. Our team will review it and get back to you shortly.",
    status: "pending", createdAt: now,
  });
  return NextResponse.json({ ok: true, message: { id: ref.id, sender: "visitor", text: message, createdAt: now }, queuedForReview: true }, { status: 201 });
}
