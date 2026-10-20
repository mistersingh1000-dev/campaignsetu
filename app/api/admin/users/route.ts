import { NextResponse } from "next/server";
import { getDb, listUsers } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 501 });
  }

  try {
    const users = await listUsers(db);
    const safe = users.map(({ password_hash, wa_token, wa_registration_pin, ...rest }) => rest);
    return NextResponse.json({ users: safe });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "list_failed" }, { status: 500 });
  }
}
