import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { findUser, getDb } from "@/lib/db";
import { createCampaign, listCampaigns } from "@/lib/marketing-db";
import { accessState, paidFeatureError } from "@/lib/entitlements";
import { whatsappApiToken } from "@/lib/whatsapp-auth";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

  try {
    const user = await findUser(db, session.sub);
    const access = user ? accessState(user) : null;
    return NextResponse.json({
      campaigns: await listCampaigns(db, session.sub),
      readOnly: access ? access.readOnly : true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim().slice(0, 120);
  const templateName = String(body.templateName || "").trim();
  const templateLanguage = String(body.templateLanguage || "en_US").trim();
  const variableValues = Array.isArray(body.variableValues)
    ? body.variableValues.map((v: unknown) => String(v).slice(0, 500)).slice(0, 20)
    : [];
  const audience = body.audience === "tag" ? "tag" : "all_opted_in";
  const audienceTag = audience === "tag" ? String(body.audienceTag || "").trim().slice(0, 40) : null;

  if (!name || !templateName) {
    return NextResponse.json(
      { error: "missing_fields", message: "Campaign name and approved template are required." },
      { status: 400 }
    );
  }
  if (audience === "tag" && !audienceTag) {
    return NextResponse.json(
      { error: "audience_tag_required", message: "Choose a contact tag for this segment." },
      { status: 400 }
    );
  }

  const user = await findUser(db, session.sub);
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  const access = accessState(user);
  if (!access.active) {
    const denied = paidFeatureError(access);
    return NextResponse.json({ error: denied.error, message: denied.message }, { status: denied.status });
  }
  if (!user.waba_id || !user.phone_number_id || user.wa_registered === false) {
    return NextResponse.json(
      { error: "whatsapp_not_ready", message: "Connect and activate WhatsApp before creating campaigns." },
      { status: 409 }
    );
  }
  const token = whatsappApiToken(user);
  if (!token) return NextResponse.json({ error: "credential_error" }, { status: 500 });

  const version = process.env.WHATSAPP_API_VERSION || "v26.0";
  try {
    const params = new URLSearchParams({
      fields: "id,name,status,category,language",
      name: templateName,
      limit: "50",
    });
    const metaRes = await fetch(
      `https://graph.facebook.com/${version}/${encodeURIComponent(user.waba_id)}/message_templates?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    const metaData = await metaRes.json().catch(() => ({}));
    if (!metaRes.ok) {
      return NextResponse.json(
        { error: "template_check_failed", message: metaData?.error?.message || "Could not verify the template with Meta." },
        { status: 502 }
      );
    }
    const matches = Array.isArray(metaData?.data) ? metaData.data : [];
    const approved = matches.some(
      (t: any) =>
        String(t?.name || "") === templateName &&
        String(t?.language || "") === templateLanguage &&
        String(t?.status || "").toUpperCase() === "APPROVED"
    );
    if (!approved) {
      return NextResponse.json(
        { error: "template_not_approved", message: "This template/language is not currently APPROVED by Meta." },
        { status: 409 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "meta_unreachable", message: "Could not reach Meta to verify the template." },
      { status: 502 }
    );
  }

  try {
    const campaign = await createCampaign(db, {
      userId: session.sub,
      name,
      templateName,
      templateLanguage,
      variableValues,
      audience,
      audienceTag,
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
