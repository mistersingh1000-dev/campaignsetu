import { NextResponse } from "next/server";
import { crmRequestContext } from "@/lib/crm-request-context";
import { beginFacebookLeadLogin, FACEBOOK_STATE_COOKIE } from "@/lib/facebook-lead-onboarding";
export const runtime="nodejs";
export async function GET() {
 const c=await crmRequestContext();if(c.error)return c.error;
 try {
  const login=await beginFacebookLeadLogin(c.db!,c.user!.email);
  const response=NextResponse.redirect(login.url);
  response.cookies.set(FACEBOOK_STATE_COOKIE,login.state,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/api/crm/facebook",maxAge:900});
  response.headers.set("Cache-Control","no-store");return response;
 }catch{return NextResponse.json({error:"Facebook customer login is awaiting Meta configuration. Contact the workspace administrator."},{status:503});}
}
