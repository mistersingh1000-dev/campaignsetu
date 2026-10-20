import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { getDb, findUser } from "@/lib/db";
import { accessState, paidFeatureError } from "@/lib/entitlements";
import { whatsappApiToken } from "@/lib/whatsapp-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "database_not_configured", message: "The database is not configured on the server." },
      { status: 503 }
    );
  }

  const user = await findUser(db, session.sub);
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const access = accessState(user);
  if (!access.active) {
    const denied = paidFeatureError(access);
    return NextResponse.json({ error: denied.error, message: denied.message }, { status: denied.status });
  }

  const { to, message, template } = await req.json().catch(() => ({}));
  if (!to || (!message && !template?.name)) {
    return NextResponse.json(
      { error: "missing_fields", message: "`to` and either `message` or `template.name` are required." },
      { status: 400 }
    );
  }

  const cleanTo = String(to).replace(/\D/g, "");
  if (!/^\d{7,15}$/.test(cleanTo)) {
    return NextResponse.json(
      { error: "invalid_recipient", message: "Recipient must be a valid international WhatsApp number." },
      { status: 400 }
    );
  }

  const PHONE_ID = user.phone_number_id;
  const TOKEN = whatsappApiToken(user);
  if (!PHONE_ID || !TOKEN || user.wa_registered === false) {
    return NextResponse.json(
      {
        error: "whatsapp_not_connected",
        message: "Connect and activate your WhatsApp number before sending real messages.",
      },
      { status: 409 }
    );
  }

  const VERSION = process.env.WHATSAPP_API_VERSION || "v26.0";
  const payload = template?.name
    ? {
        messaging_product: "whatsapp",
        to: cleanTo,
        type: "template",
        template: {
          name: String(template.name),
          language: { code: String(template.language || "en_US") },
          ...(Array.isArray(template.components) ? { components: template.components } : {}),
        },
      }
    : {
        messaging_product: "whatsapp",
        to: cleanTo,
        type: "text",
        text: { preview_url: false, body: String(message).slice(0, 4096) },
      };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${VERSION}/${encodeURIComponent(PHONE_ID)}/messages`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      }
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      {
        ok: res.ok,
        result: data,
        ...(res.ok
          ? {}
          : {
              message:
                data?.error?.message ||
                "WhatsApp rejected the message. Use an approved template when starting a conversation outside the customer-service window.",
            }),
      },
      { status: res.ok ? 200 : 502 }
    );
  } catch {
    return NextResponse.json(
      { error: "meta_unreachable", message: "Could not reach Meta to send this message." },
      { status: 502 }
    );
  }
}
