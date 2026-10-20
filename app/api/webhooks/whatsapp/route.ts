import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  createConversation,
  addMessage,
  updateMessageStatus,
  convId,
  createContact,
  updateContactForUser,
} from "@/lib/chat-db";
import {
  updateCampaignRecipientByWaMessageId,
  refreshCampaignCounts,
} from "@/lib/marketing-db";
import { runInboundAutomations } from "@/lib/automation-engine";
import { whatsappMessageAlreadyProcessed } from "@/lib/webhook-idempotency";

export const runtime = "nodejs";

function validMetaSignature(rawBody: string, signature: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signature?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function isOptOut(text: string): boolean {
  const normalized = text.trim().toUpperCase().replace(/[.!]+$/g, "");
  return ["STOP", "UNSUBSCRIBE", "REMOVE ME", "OPT OUT", "OPTOUT"].includes(normalized);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expected = process.env.WHATSAPP_WEBHOOK_TOKEN;
  if (mode === "subscribe" && expected && token === expected) {
    return new NextResponse(challenge || "", { status: 200 });
  }
  return NextResponse.json({ error: "invalid_verify_token" }, { status: 403 });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  if (!process.env.META_APP_SECRET) {
    console.error("Webhook received but META_APP_SECRET is not configured");
    return NextResponse.json({ error: "webhook_security_not_configured" }, { status: 503 });
  }

  if (!validMetaSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    console.error("Webhook received but database is not configured");
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }

  try {
    const body = JSON.parse(rawBody || "{}");
    const campaignsToRefresh = new Set<string>();

    for (const entry of body?.entry || []) {
      for (const change of entry?.changes || []) {
        const value = change?.value;
        if (!value) continue;

        const phoneNumberId = value?.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        const owners = await db
          .collection("users")
          .where("phone_number_id", "==", phoneNumberId)
          .limit(1)
          .get();

        if (owners.empty) {
          console.warn("No user for phone_number_id", phoneNumberId);
          continue;
        }

        const owner = owners.docs[0].data() as any;
        const userId = owner.email as string;

        for (const status of value?.statuses || []) {
          if (!status?.id || !status?.status) continue;
          const normalizedStatus = String(status.status) as "sent" | "delivered" | "read" | "failed";
          if (["sent", "delivered", "read", "failed"].includes(normalizedStatus)) {
            await updateMessageStatus(db, status.id, normalizedStatus);
          }
          if (["delivered", "read", "failed"].includes(normalizedStatus)) {
            const campaignId = await updateCampaignRecipientByWaMessageId(
              db,
              status.id,
              normalizedStatus as "delivered" | "read" | "failed"
            );
            if (campaignId) campaignsToRefresh.add(campaignId);
          }
        }

        for (const msg of value?.messages || []) {
          const from = msg?.from;
          if (!from) continue;

          // Meta may retry webhook deliveries. Never create duplicate CRM
          // messages or fire the same automation twice for the same WA message.
          if (await whatsappMessageAlreadyProcessed(db, msg?.id)) continue;

          const text =
            msg?.text?.body ||
            msg?.button?.text ||
            msg?.interactive?.list_reply?.title ||
            msg?.interactive?.button_reply?.title ||
            `[${msg?.type || "unsupported"} message]`;
          const profileName = value?.contacts?.[0]?.profile?.name || null;

          const contact = await createContact(db, userId, from, profileName, {
            source: "inbound-whatsapp",
            lastMessageTime: new Date().toISOString(),
          });

          const optedOut = isOptOut(text);
          if (optedOut) {
            await updateContactForUser(db, userId, contact.id, {
              marketingOptIn: false,
              optInAt: null,
              optInSource: null,
              doNotMessage: true,
            });
            contact.marketingOptIn = false;
            contact.doNotMessage = true;
          }

          const id = convId(userId, from);
          const existing = await db.collection("conversations").doc(id).get();

          if (!existing.exists) {
            await createConversation(
              db,
              userId,
              phoneNumberId,
              owner.waba_id || null,
              from,
              profileName
            );
          }

          await addMessage(db, userId, id, "contact", text, msg?.id || null);

          if (!optedOut) {
            // Automation failures must not make Meta retry the whole webhook;
            // log them and keep the inbound message safely stored.
            await runInboundAutomations({
              db,
              owner,
              contact,
              conversationId: id,
              inboundText: text,
            }).catch((e) => console.error("Automation error:", e?.message || e));
          }
        }
      }
    }

    for (const campaignId of campaignsToRefresh) {
      await refreshCampaignCounts(db, campaignId).catch(() => null);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Webhook error:", e?.message || e);
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 500 });
  }
}
