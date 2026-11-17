import { NextResponse } from "next/server";
import { crmRequestContext } from "@/lib/crm-request-context";
import { startFacebookPublishLogin, FB_PUBLISH_STATE_COOKIE } from "@/lib/facebook-publishing";
export const runtime = "nodejs";
export async function GET() {
  const c = await crmRequestContext(); if (c.error) return c.error;
  try {
    const login = await startFacebookPublishLogin(c.db!, c.user!.email);
    const r = NextResponse.redirect(login.url);
    r.cookies.set(FB_PUBLISH_STATE_COOKIE, login.state, {httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/api/crm/facebook-publishing",maxAge:600});
    r.headers.set("Cache-Control","no-store"); return r;
  } catch { return NextResponse.json({error:"Meta App ID, App Secret and site URL must be configured by the platform administrator."},{status:503}); }
}
