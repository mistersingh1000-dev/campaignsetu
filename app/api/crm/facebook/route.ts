import { NextResponse } from "next/server";
import { crmRequestContext } from "@/lib/crm-request-context";
import { oauthConfigured, pendingFacebookPages, selectedFacebookPage, connectFacebookPage } from "@/lib/facebook-lead-onboarding";
import { CrmPlanError } from "@/lib/crm-plans";
export const runtime="nodejs";
export async function GET() {
 const c=await crmRequestContext();if(c.error)return c.error;
 try {
  const [connected,pending]=await Promise.all([c.db!.collection("crm_facebook_pages").where("userId","==",c.user!.email).get(),pendingFacebookPages(c.db!,c.user!.email)]);
  const candidates=await Promise.all(pending.map(async p=>{const existing=await c.db!.collection("crm_facebook_pages").doc(p.id).get();return {id:p.id,name:p.name,available:!existing.exists||existing.data()?.userId===c.user!.email};}));
  return NextResponse.json({loginConfigured:oauthConfigured(),pages:connected.docs.map(d=>({id:d.id,name:d.data().name,status:d.data().status,lastLeadReceivedAt:d.data().lastLeadReceivedAt||null})),selectablePages:candidates},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Unable to load Facebook Page connections."},{status:503});}
}
export async function POST(req:Request) {
 const c=await crmRequestContext();if(c.error)return c.error;
 const origin=process.env.NEXT_PUBLIC_SITE_URL;
 if(!origin||req.headers.get("origin")!==new URL(origin).origin)return NextResponse.json({error:"Invalid request origin."},{status:403});
 const input=await req.json().catch(()=>({}));
 const pageId=typeof input.pageId==="string"?input.pageId:"";
 if(!/^\d{1,40}$/.test(pageId))return NextResponse.json({error:"Choose a Facebook Page from your authorized list."},{status:400});
 try {
  const page=await selectedFacebookPage(c.db!,c.user!.email,pageId);
  if(!page)return NextResponse.json({error:"Page authorization expired. Connect Facebook again."},{status:400});
  const connected=await connectFacebookPage(c.db!,c.user!.email,page);
  return NextResponse.json({page:connected});
 }catch(e:any){
  if(e instanceof CrmPlanError)return NextResponse.json({error:e.message,code:e.code},{status:402});
  const conflict=e?.message==="page_workspace_conflict";
  return NextResponse.json({error:conflict?"This Page is assigned to another workspace. Contact support before transferring it.":"Meta could not enable lead capture. Your Page authorization is retained for retry. Check Page permissions and app review."},{status:conflict?409:502});
 }
}
