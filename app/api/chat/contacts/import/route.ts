import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { findUser, getDb } from "@/lib/db";
import { accessState, paidFeatureError } from "@/lib/entitlements";
import { createContact } from "@/lib/chat-db";

export const runtime = "nodejs";

function cleanPhone(value: unknown): string | null {
  const clean = String(value || "").replace(/[^\d+]/g, "");
  if (!/^\+?\d{7,15}$/.test(clean)) return null;
  return clean;
}

function cleanText(value: unknown, max: number): string | null {
  const text = String(value || "").trim().slice(0, max);
  return text || null;
}

function cleanTags(value: unknown): string[] {
  const rows = Array.isArray(value) ? value : String(value || "").split(/[|;]/g);
  return Array.from(
    new Set(rows.map((tag) => String(tag).trim().slice(0, 40)).filter(Boolean))
  ).slice(0, 25);
}

export async function POST(req: Request) {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const user = await findUser(db, session.sub);
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  const access = accessState(user);
  if (!access.active) {
    const denied = paidFeatureError(access);
    return NextResponse.json({ error: denied.error, message: denied.message }, { status: denied.status });
  }

  const body = await req.json().catch(() => ({}));
  const rows = Array.isArray(body.contacts) ? body.contacts.slice(0, 500) : [];
  if (!rows.length) {
    return NextResponse.json(
      { error: "contacts_required", message: "Upload at least one contact." },
      { status: 400 }
    );
  }

  let imported = 0;
  let skipped = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] || {};
    const phone = cleanPhone(row.phone);
    if (!phone) {
      skipped += 1;
      if (errors.length < 25) errors.push({ row: i + 2, error: "Invalid or missing phone number" });
      continue;
    }

    const optedIn = row.marketingOptIn === true || String(row.marketingOptIn || "").trim().toLowerCase() === "true";
    const doNotMessage = row.doNotMessage === true || String(row.doNotMessage || "").trim().toLowerCase() === "true";

    try {
      await createContact(db, session.sub, phone, cleanText(row.name, 120), {
        source: "csv-import",
        email: cleanText(row.email, 200),
        company: cleanText(row.company, 160),
        city: cleanText(row.city, 120),
        tags: cleanTags(row.tags),
        marketingOptIn: optedIn && !doNotMessage,
        optInSource: optedIn && !doNotMessage
          ? cleanText(row.optInSource, 120) || "csv-import-confirmed"
          : null,
        optInAt: optedIn && !doNotMessage ? new Date().toISOString() : null,
        doNotMessage,
      });
      imported += 1;
    } catch (e: any) {
      skipped += 1;
      if (errors.length < 25) errors.push({ row: i + 2, error: String(e?.message || "Import failed").slice(0, 160) });
    }
  }

  return NextResponse.json({
    ok: true,
    imported,
    skipped,
    processed: imported + skipped,
    truncated: Array.isArray(body.contacts) && body.contacts.length > 500,
    errors,
  });
}
