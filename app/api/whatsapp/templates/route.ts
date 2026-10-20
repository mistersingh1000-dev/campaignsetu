import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { findUser, getDb } from "@/lib/db";
import { accessState, paidFeatureError } from "@/lib/entitlements";
import { whatsappApiToken } from "@/lib/whatsapp-auth";

export const runtime = "nodejs";

async function currentUser(requireActive = false) {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) return { error: NextResponse.json({ error: "not_authenticated" }, { status: 401 }) };
  const db = getDb();
  if (!db) return { error: NextResponse.json({ error: "database_not_configured" }, { status: 503 }) };
  const user = await findUser(db, session.sub);
  if (!user) return { error: NextResponse.json({ error: "user_not_found" }, { status: 404 }) };

  const access = accessState(user);
  if (requireActive && !access.active) {
    const denied = paidFeatureError(access);
    return { error: NextResponse.json({ error: denied.error, message: denied.message }, { status: denied.status }) };
  }

  if (!user.waba_id || !user.phone_number_id || user.wa_registered === false) {
    return {
      error: NextResponse.json(
        { error: "whatsapp_not_ready", message: "Connect and activate WhatsApp before managing templates." },
        { status: 409 }
      ),
    };
  }
  const token = whatsappApiToken(user);
  if (!token) return { error: NextResponse.json({ error: "credential_error" }, { status: 500 }) };
  return { user, token, access };
}

export async function GET() {
  const ctx = await currentUser(false);
  if (ctx.error) return ctx.error;
  const { user, token } = ctx;
  const version = process.env.WHATSAPP_API_VERSION || "v26.0";

  const url =
    `https://graph.facebook.com/${version}/${encodeURIComponent(user.waba_id!)}` +
    "/message_templates?fields=id,name,status,category,language,components&limit=100";

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: "meta_templates_failed", message: data?.error?.message || "Could not load templates from Meta." },
        { status: 502 }
      );
    }
    return NextResponse.json({
      templates: data?.data || [],
      paging: data?.paging || null,
      readOnly: ctx.access?.readOnly || false,
    });
  } catch {
    return NextResponse.json(
      { error: "meta_unreachable", message: "Could not reach Meta to load templates." },
      { status: 502 }
    );
  }
}

export async function POST(req: Request) {
  const ctx = await currentUser(true);
  if (ctx.error) return ctx.error;
  const { user, token } = ctx;
  const body = await req.json().catch(() => ({}));

  const name = String(body.name || "").trim().toLowerCase();
  const language = String(body.language || "en_US").trim();
  const category = String(body.category || "MARKETING").toUpperCase();
  const text = String(body.body || "").trim();
  const footer = String(body.footer || "").trim();

  if (!/^[a-z0-9_]{3,512}$/.test(name)) {
    return NextResponse.json(
      { error: "invalid_name", message: "Template name must use lowercase letters, numbers and underscores only." },
      { status: 400 }
    );
  }
  if (!new Set(["MARKETING", "UTILITY"]).has(category)) {
    return NextResponse.json(
      { error: "invalid_category", message: "This simple creator supports MARKETING or UTILITY templates." },
      { status: 400 }
    );
  }
  if (!text || text.length > 1024) {
    return NextResponse.json(
      { error: "invalid_body", message: "Template body is required and must be 1024 characters or less." },
      { status: 400 }
    );
  }

  const components: any[] = [{ type: "BODY", text }];
  if (footer) components.push({ type: "FOOTER", text: footer.slice(0, 60) });

  const version = process.env.WHATSAPP_API_VERSION || "v26.0";
  try {
    const res = await fetch(
      `https://graph.facebook.com/${version}/${encodeURIComponent(user.waba_id!)}/message_templates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, language, category, components }),
        cache: "no-store",
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: "meta_template_create_failed", message: data?.error?.message || "Meta rejected the template." },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, template: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "meta_unreachable", message: "Could not reach Meta to create the template." },
      { status: 502 }
    );
  }
}
