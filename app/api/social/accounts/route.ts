import { NextResponse } from "next/server";
import { crmRequestContext } from "@/lib/crm-request-context";
import { socialConfigStatus } from "@/lib/social-accounts";

export const runtime = "nodejs";

export async function GET() {
  const c = await crmRequestContext();
  if (c.error) return c.error;
  try {
    const [socialSnap, userSnap] = await Promise.all([
      c.db!.collection("social_accounts").where("userId", "==", c.user!.email).get(),
      c.db!.collection("users").doc(c.user!.email).get(),
    ]);
    const accounts = socialSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        platform: d.platform,
        accountId: d.accountId,
        accountName: d.accountName,
        username: d.username || null,
        status: d.status || "connected",
        updatedAt: d.updatedAt || null,
      };
    });
    const userData = userSnap.data() || {};
    return NextResponse.json({
      config: socialConfigStatus(),
      whatsappConnected: Boolean(userData.whatsappConnected || userData.phoneNumberId),
      accounts,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load social accounts." }, { status: 503 });
  }
}

export async function DELETE(req: Request) {
  const c = await crmRequestContext();
  if (c.error) return c.error;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Account id required." }, { status: 400 });
  const ref = c.db!.collection("social_accounts").doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.userId !== c.user!.email) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  await ref.delete();
  return NextResponse.json({ ok: true });
}
