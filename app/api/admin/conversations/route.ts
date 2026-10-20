import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listAllConversations } from "@/lib/chat-db";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "no_db" }, { status: 501 });

  try {
    const conversations = await listAllConversations(db);
    return NextResponse.json({ conversations });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
