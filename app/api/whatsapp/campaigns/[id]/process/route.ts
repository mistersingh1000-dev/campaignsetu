import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { processCampaignBatch } from "@/lib/whatsapp-campaigns";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: any) {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

  const resolved = await params;
  const campaignId = decodeURIComponent(String(resolved?.id || ""));
  if (!campaignId) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  try {
    const campaign = await processCampaignBatch(db, session.sub, campaignId, 20);
    if (!campaign) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ campaign });
  } catch (e: any) {
    const code = String(e?.message || "failed");
    if (code === "campaign_not_found") return NextResponse.json({ error: code }, { status: 404 });
    if (code === "whatsapp_not_ready") {
      return NextResponse.json({ error: code, message: "WhatsApp connection is not fully active." }, { status: 409 });
    }
    if (code === "access_expired") {
      return NextResponse.json({ error: code, message: "Your subscription has ended. Renew to continue this campaign." }, { status: 402 });
    }
    return NextResponse.json({ error: code }, { status: 500 });
  }
}
