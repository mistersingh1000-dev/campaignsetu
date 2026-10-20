import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getConversation, getMessages } from "@/lib/chat-db";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: any) {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "no_db" }, { status: 501 });

  const resolved = await params;
  const conversationId = decodeURIComponent(resolved?.id || "");
  if (!conversationId) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  try {
    const conv = await getConversation(db, conversationId);
    if (!conv) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (conv.userId !== session.sub) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

    const messages = await getMessages(db, conversationId, 50);
    return NextResponse.json({ messages });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
