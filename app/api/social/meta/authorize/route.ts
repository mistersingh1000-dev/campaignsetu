import { NextResponse } from "next/server";
import { crmRequestContext } from "@/lib/crm-request-context";
import { beginMetaSocialAuth, SOCIAL_META_STATE_COOKIE } from "@/lib/social-accounts";

export const runtime = "nodejs";

export async function GET() {
  const c = await crmRequestContext();
  if (c.error) return c.error;
  try {
    const { state, url } = await beginMetaSocialAuth(c.db!, c.user!.email);
    const res = NextResponse.redirect(url);
    res.cookies.set(SOCIAL_META_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 900,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Meta social login is not configured." }, { status: 400 });
  }
}
