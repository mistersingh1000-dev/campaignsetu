import { NextResponse } from "next/server";
import { crmRequestContext } from "@/lib/crm-request-context";
import {
  publishToFacebook,
  publishToInstagram,
  publishToTwitter,
  type StoredSocialAccount,
} from "@/lib/social-accounts";

export const runtime = "nodejs";

export async function GET() {
  const c = await crmRequestContext();
  if (c.error) return c.error;
  try {
    const snap = await c.db!
      .collection("social_posts")
      .where("userId", "==", c.user!.email)
      .limit(25)
      .get();
    const posts = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return NextResponse.json({ posts }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load social posts." }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const c = await crmRequestContext();
  if (c.error) return c.error;
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl.trim() : "";
  const mediaType = typeof body.mediaType === "string" ? body.mediaType : "text";
  const scheduledAt = typeof body.scheduledAt === "string" && body.scheduledAt.trim() ? body.scheduledAt.trim() : null;
  const accountIds: string[] = Array.isArray(body.accountIds) ? body.accountIds.filter((x: unknown) => typeof x === "string") : [];

  if (!text && !mediaUrl) {
    return NextResponse.json({ error: "Post caption or media URL is required." }, { status: 400 });
  }
  if (!accountIds.length) {
    return NextResponse.json({ error: "Select at least one connected social account." }, { status: 400 });
  }

  const now = new Date().toISOString();
  if (scheduledAt) {
    const docRef = await c.db!.collection("social_posts").add({
      userId: c.user!.email,
      text,
      mediaUrl: mediaUrl || null,
      mediaType,
      accountIds,
      scheduledAt,
      status: "scheduled",
      results: {},
      createdAt: now,
    });
    return NextResponse.json({ id: docRef.id, status: "scheduled", scheduledAt });
  }

  const results: Record<string, { ok: boolean; detail: string }> = {};
  for (const id of accountIds) {
    try {
      const snap = await c.db!.collection("social_accounts").doc(id).get();
      const acc = snap.data() as StoredSocialAccount | undefined;
      if (!snap.exists || acc?.userId !== c.user!.email) {
        results[id] = { ok: false, detail: "Account not found." };
        continue;
      }
      if (acc.platform === "facebook") {
        await publishToFacebook(acc, { text, mediaUrl, mediaType });
        results[id] = { ok: true, detail: `Published to Facebook (${acc.accountName})` };
      } else if (acc.platform === "instagram") {
        await publishToInstagram(acc, { text, mediaUrl, mediaType });
        results[id] = { ok: true, detail: `Published to Instagram (${acc.accountName})` };
      } else if (acc.platform === "twitter") {
        await publishToTwitter(acc, { text });
        results[id] = { ok: true, detail: `Published to X (${acc.accountName})` };
      } else {
        results[id] = { ok: false, detail: "Use WhatsApp Campaigns for template broadcasts." };
      }
    } catch (e: any) {
      results[id] = { ok: false, detail: e?.message || "Publish failed." };
    }
  }

  const anyOk = Object.values(results).some((r) => r.ok);
  const status = anyOk ? "published" : "failed";
  const docRef = await c.db!.collection("social_posts").add({
    userId: c.user!.email,
    text,
    mediaUrl: mediaUrl || null,
    mediaType,
    accountIds,
    status,
    results,
    createdAt: now,
  });

  return NextResponse.json({ id: docRef.id, status, results });
}
