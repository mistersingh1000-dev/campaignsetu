import { NextRequest, NextResponse } from "next/server";
import { crmRequestContext } from "@/lib/crm-request-context";
import { completeTwitterAuth, SOCIAL_TWITTER_STATE_COOKIE } from "@/lib/social-accounts";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const c = await crmRequestContext();
  if (c.error) return NextResponse.redirect(new URL("/login", siteUrl));
  const code = req.nextUrl.searchParams.get("code") || "";
  const state = req.nextUrl.searchParams.get("state") || "";
  const cookie = req.cookies.get(SOCIAL_TWITTER_STATE_COOKIE)?.value || "";
  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/channels?social=twitter_cancelled", siteUrl));
  }
  try {
    await completeTwitterAuth(c.db!, c.user!.email, code, state, cookie);
    const res = NextResponse.redirect(new URL("/dashboard/channels?social=twitter_connected", siteUrl));
    res.cookies.delete(SOCIAL_TWITTER_STATE_COOKIE);
    return res;
  } catch {
    return NextResponse.redirect(new URL("/dashboard/channels?social=twitter_error", siteUrl));
  }
}
