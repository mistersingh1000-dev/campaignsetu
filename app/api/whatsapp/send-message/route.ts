import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { getDb, findUser } from "@/lib/db";
import { getConversation, addMessage } from "@/lib/chat-db";
import { accessState, paidFeatureError } from "@/lib/entitlements";
import { whatsappApiToken } from "@/lib/whatsapp-auth";

export const runtime = "nodejs";

const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || "v26.0";

export async function POST(req: Request) {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "no_db" }, { status: 501 });

  const { conversationId, content } = await req.json().catch(() => ({}));
  if (!conversationId || !content) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    const conv = await getConversation(db, conversationId);
    if (!conv) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (conv.userId !== session.sub) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }

    const user = await findUser(db, session.sub);
    if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

    const access = accessState(user);
    if (!access.active) {
      const denied = paidFeatureError(access);
      return NextResponse.json({ error: denied.error, message: denied.message }, { status: denied.status });
    }

    const token = whatsappApiToken(user);
    if (!token || !user.phone_number_id || user.wa_registered === false) {
      return NextResponse.json(
        {
          error: "whatsapp_not_connected",
          message: "Connect and activate your WhatsApp number in API Setup first.",
        },
        { status: 400 }
      );
    }

    const waRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(user.phone_number_id)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: conv.contactPhone,
          type: "text",
          text: { preview_url: false, body: String(content).slice(0, 4096) },
        }),
        cache: "no-store",
      }
    );

    const waData = await waRes.json().catch(() => ({}));
    if (!waRes.ok) {
      return NextResponse.json(
        {
          error: "send_failed",
          message:
            waData?.error?.message ||
            "WhatsApp rejected the message. If the customer-service window has expired, send an approved template to reopen the conversation.",
        },
        { status: 502 }
      );
    }

    const waMessageId = waData?.messages?.[0]?.id || null;
    const msg = await addMessage(db, session.sub, conversationId, "user", String(content), waMessageId);

    return NextResponse.json({ message: msg });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
