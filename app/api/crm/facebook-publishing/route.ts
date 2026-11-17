import { NextResponse } from "next/server";
import { crmRequestContext } from "@/lib/crm-request-context";
import { facebookPublishConfigured, listFacebookPublishPages, publishFacebookPost } from "@/lib/facebook-publishing";
export const runtime = "nodejs";
export async function GET() {
  const c=await crmRequestContext(); if(c.error)return c.error;
  try { return NextResponse.json({configured:facebookPublishConfigured(),pages:await listFacebookPublishPages(c.db!,c.user!.email)},{headers:{"Cache-Control":"no-store"}}); }
  catch { return NextResponse.json({error:"Unable to load Facebook publishing connections."},{status:503}); }
}
export async function POST(req:Request) {
  const c=await crmRequestContext(); if(c.error)return c.error;
  const origin=process.env.NEXT_PUBLIC_SITE_URL;
  if(!origin || req.headers.get("origin")!==new URL(origin).origin) return NextResponse.json({error:"Invalid request origin."},{status:403});
  const input=await req.json().catch(()=>({}));
  const pageId=typeof input.pageId==="string"?input.pageId:"";
  const message=typeof input.message==="string"?input.message.trim():"";
  const imageUrl=typeof input.imageUrl==="string"?input.imageUrl.trim():"";
  if(!/^\d{1,40}$/.test(pageId)||!message||message.length>63206) return NextResponse.json({error:"Select a connected Page and enter a post caption."},{status:400});
  if(imageUrl){try{const u=new URL(imageUrl);if(u.protocol!=="https:")throw Error();}catch{return NextResponse.json({error:"Image URL must be a valid HTTPS URL."},{status:400});}}
  try { const result=await publishFacebookPost(c.db!,c.user!.email,pageId,message,imageUrl||undefined); return NextResponse.json({success:true,result}); }
  catch(e:any){return NextResponse.json({error:e?.message==="page_not_connected"?"Connect this Facebook Page first.":e?.message||"Facebook could not publish this post. Check App Review and Page permissions."},{status:502});}
}
