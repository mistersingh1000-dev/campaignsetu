import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { crmRequestContext } from "@/lib/crm-request-context";
import { consumeFacebookLeadState, discoverFacebookPages, stageFacebookPages, FACEBOOK_STATE_COOKIE, callbackUrl } from "@/lib/facebook-lead-onboarding";
export const runtime="nodejs";
export async function GET(req:Request) {
 const c=await crmRequestContext();if(c.error)return c.error;
 const params=new URL(req.url).searchParams;
 const finish=(status:string)=>{const url=new URL("/dashboard/lead-crm",callbackUrl());url.searchParams.set("facebook_status",status);const r=NextResponse.redirect(url);r.cookies.set(FACEBOOK_STATE_COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/api/crm/facebook",maxAge:0});r.headers.set("Cache-Control","no-store");return r;};
 const valid=await consumeFacebookLeadState(c.db!,c.user!.email,params.get("state")||"",(await cookies()).get(FACEBOOK_STATE_COOKIE)?.value||"");
 if(!valid)return finish("invalid_state");
 if(params.get("error"))return finish("cancelled");
 const code=params.get("code");if(!code)return finish("authorization_failed");
 try {
  const pages=await discoverFacebookPages(code);
  await stageFacebookPages(c.db!,c.user!.email,pages);
  return finish("choose_page");
 }catch(e:any){const allowed=["permissions_missing","no_pages_available","page_discovery_limit"];return finish(allowed.includes(e?.message)?e.message:"authorization_failed");}
}
