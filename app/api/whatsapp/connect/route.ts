import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { getDb, findUser, updateUser } from "@/lib/db";
import { encryptCredential } from "@/lib/credential-crypto";
import { accessState, paidFeatureError } from "@/lib/entitlements";

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

  const { phone_number_id, waba_id, wa_token } = await req.json().catch(() => ({}));
  if (!phone_number_id || !wa_token) {
    return NextResponse.json(
      { error: "missing", message: "Phone Number ID and access token are required." },
      { status: 400 }
    );
  }

  const VERSION = process.env.WHATSAPP_API_VERSION || "v26.0";

  let display = "";
  try {
    const r = await fetch(
      `https://graph.facebook.com/${VERSION}/${encodeURIComponent(phone_number_id)}?fields=id,display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${wa_token}` }, cache: "no-store" }
    );
    const info = await r.json().catch(() => ({}));
    if (!r.ok) {
      return NextResponse.json(
        {
          error: "invalid",
          message:
            info?.error?.message ||
            "Meta rejected these credentials. Double-check the Phone Number ID and token.",
        },
        { status: 400 }
      );
    }
    if (String(info?.id || "") !== String(phone_number_id)) {
      return NextResponse.json(
        { error: "phone_mismatch", message: "The token does not belong to this Phone Number ID." },
        { status: 400 }
      );
    }
    display = info.display_phone_number || "";
  } catch {
    return NextResponse.json(
      { error: "verify_failed", message: "Could not reach Meta to verify. Try again." },
      { status: 502 }
    );
  }

  await updateUser(db, session.sub, {
    phone_number_id,
    waba_id: waba_id || null,
    wa_token: encryptCredential(wa_token),
    wa_registered: true,
  });

  return NextResponse.json({ ok: true, phone_number_id, display, trialAccess: user.plan === "trial" });
}
