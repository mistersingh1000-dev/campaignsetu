import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { findUser, getDb } from "@/lib/db";
import { accessState, paidFeatureError } from "@/lib/entitlements";
import { createContact, listContacts, updateContactForUser } from "@/lib/chat-db";

export const runtime = "nodejs";

async function context(requireActive = false) {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) return { error: NextResponse.json({ error: "not_authenticated" }, { status: 401 }) };
  const db = getDb();
  if (!db) return { error: NextResponse.json({ error: "no_db" }, { status: 501 }) };
  const user = await findUser(db, session.sub);
  if (!user) return { error: NextResponse.json({ error: "user_not_found" }, { status: 404 }) };
  const access = accessState(user);
  if (requireActive && !access.active) {
    const denied = paidFeatureError(access);
    return { error: NextResponse.json({ error: denied.error, message: denied.message }, { status: denied.status }) };
  }
  return { session, db, access };
}

export async function GET() {
  const ctx = await context(false);
  if (ctx.error) return ctx.error;

  try {
    const contacts = await listContacts(ctx.db!, ctx.session!.sub);
    return NextResponse.json({ contacts, readOnly: ctx.access!.readOnly });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const ctx = await context(true);
  if (ctx.error) return ctx.error;

  const { phone, name, marketingOptIn, optInSource } = await req.json().catch(() => ({}));
  if (!phone) return NextResponse.json({ error: "phone_required" }, { status: 400 });

  const clean = String(phone).replace(/[^\d+]/g, "");
  if (!/^\+?\d{7,15}$/.test(clean)) {
    return NextResponse.json(
      { error: "invalid_phone", message: "Use international format, e.g. +919876543210" },
      { status: 400 }
    );
  }

  try {
    const optedIn = marketingOptIn === true;
    const contact = await createContact(ctx.db!, ctx.session!.sub, clean, name || null, {
      source: "manual",
      marketingOptIn: optedIn,
      optInSource: optedIn ? String(optInSource || "manual-confirmation").slice(0, 120) : null,
      optInAt: optedIn ? new Date().toISOString() : null,
      doNotMessage: false,
    });
    return NextResponse.json({ contact }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const ctx = await context(true);
  if (ctx.error) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const contactId = String(body.contactId || "");
  if (!contactId) return NextResponse.json({ error: "contact_id_required" }, { status: 400 });

  const updates: Record<string, any> = {};
  if (typeof body.name === "string") updates.name = body.name.trim().slice(0, 120) || null;
  if (typeof body.email === "string") updates.email = body.email.trim().slice(0, 200) || null;
  if (typeof body.company === "string") updates.company = body.company.trim().slice(0, 160) || null;
  if (typeof body.city === "string") updates.city = body.city.trim().slice(0, 120) || null;
  if (Array.isArray(body.tags)) {
    updates.tags = body.tags
      .map((tag: unknown) => String(tag).trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 25);
  }
  if (typeof body.marketingOptIn === "boolean") {
    updates.marketingOptIn = body.marketingOptIn;
    updates.optInAt = body.marketingOptIn ? new Date().toISOString() : null;
    updates.optInSource = body.marketingOptIn
      ? String(body.optInSource || "manual-confirmation").slice(0, 120)
      : null;
  }
  if (typeof body.doNotMessage === "boolean") {
    updates.doNotMessage = body.doNotMessage;
    if (body.doNotMessage) updates.marketingOptIn = false;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  try {
    const contact = await updateContactForUser(ctx.db!, ctx.session!.sub, contactId, updates);
    if (!contact) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ contact });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
