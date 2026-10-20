import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { findUser, getDb } from "@/lib/db";
import { listMarketingOptedInContacts } from "@/lib/chat-db";
import { accessState, paidFeatureError } from "@/lib/entitlements";
import { getCampaign, seedCampaignRecipients } from "@/lib/marketing-db";
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
    const user = await findUser(db, session.sub);
    if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    const access = accessState(user);
    if (!access.active) {
      const denied = paidFeatureError(access);
      return NextResponse.json({ error: denied.error, message: denied.message }, { status: denied.status });
    }

    const campaign = await getCampaign(db, campaignId);
    if (!campaign || campaign.userId !== session.sub) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (campaign.status !== "draft") {
      return NextResponse.json(
        { error: "already_launched", message: "This campaign has already been launched." },
        { status: 409 }
      );
    }

    let contacts = await listMarketingOptedInContacts(db, session.sub);
    if (campaign.audience === "tag") {
      const tag = String(campaign.audienceTag || "").trim().toLowerCase();
      contacts = contacts.filter((contact) =>
        (contact.tags || []).some((candidate) => String(candidate).trim().toLowerCase() === tag)
      );
    }

    if (!contacts.length) {
      return NextResponse.json(
        {
          error: "no_eligible_contacts",
          message: campaign.audience === "tag"
            ? `No opted-in contacts currently have the tag “${campaign.audienceTag || "selected tag"}”.`
            : "No contacts have marketing opt-in. Confirm consent in Contacts before launching a campaign.",
        },
        { status: 409 }
      );
    }

    const maxRecipients = Math.max(1, Number(process.env.CAMPAIGN_MAX_RECIPIENTS || 1000));
    if (contacts.length > maxRecipients) {
      return NextResponse.json(
        {
          error: "audience_too_large",
          message: `This deployment allows up to ${maxRecipients} recipients per campaign. Use a tag segment or reduce the audience before sending.`,
        },
        { status: 409 }
      );
    }

    const total = await seedCampaignRecipients(
      db,
      campaign,
      contacts.map((c) => ({ id: c.id, phone: c.phone, name: c.name }))
    );
    const updated = await processCampaignBatch(db, session.sub, campaignId, 20);
    return NextResponse.json({ ok: true, totalRecipients: total, campaign: updated });
  } catch (e: any) {
    const code = String(e?.message || "");
    if (code === "whatsapp_not_ready") {
      return NextResponse.json(
        { error: code, message: "WhatsApp connection is not fully active." },
        { status: 409 }
      );
    }
    if (code === "access_expired") {
      return NextResponse.json(
        { error: code, message: "Your subscription access has ended. Renew before launching campaigns." },
        { status: 402 }
      );
    }
    return NextResponse.json({ error: code || "failed" }, { status: 500 });
  }
}
