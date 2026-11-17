import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { crmRequestContext } from "@/lib/crm-request-context";
import { consumeFacebookPublishState, exchangeAndSavePages, FB_PUBLISH_STATE_COOKIE, facebookPublishCallback } from "@/lib/facebook-publishing";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const c = await crmRequestContext(); if (c.error) return c.error;
  const q = new URL(req.url).searchParams;
  const finish = (status:string) => {
    const u = new URL("/dashboard/social-publishing", facebookPublishCallback()); u.searchParams.set("facebook_status",status);
    const r = NextResponse.redirect(u); r.cookies.set(FB_PUBLISH_STATE_COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/api/crm/facebook-publishing",maxAge:0}); r.headers.set("Cache-Control","no-store"); return r;
  };
  const valid = await consumeFacebookPublishState(c.db!,c.user!.email,q.get("state")||"",(await cookies()).get(FB_PUBLISH_STATE_COOKIE)?.value||"");
  if (!valid) return finish("invalid_state");
  if (q.get("error")) return finish("cancelled");
  const code=q.get("code"); if(!code) return finish("failed");
  try { const pages=await exchangeAndSavePages(c.db!,c.user!.email,code); return finish(pages.length?"connected":"no_pages"); }
  catch { return finish("failed"); }
}
