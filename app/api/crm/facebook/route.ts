import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { getDb, findUser } from "@/lib/db";
import { accessState } from "@/lib/entitlements";
import { encryptCredential } from "@/lib/credential-crypto";
export const runtime = "nodejs";
async function context() {
 const session=await verifySession((await cookies()).get(COOKIE_NAME)?.value);
 if(!session) return {error:NextResponse.json({error:"Sign in required."},{status:401})};
 const db=getDb(); if(!db) return {error:NextResponse.json({error:"Database unavailable."},{status:503})};
 const user=await findUser(db,session.sub);
 if(!user||!accessState(user).active) return {error:NextResponse.json({error:"Active account required."},{status:403})};
 return {db,user};
}
export async function GET() {
 const c=await context();if(c.error)return c.error;
 const snap=await c.db!.collection("crm_facebook_pages").where("userId","==",c.user!.email).get();
 return NextResponse.json({pages:snap.docs.map(d=>({id:d.id,name:d.data().name,status:d.data().status}))});
}
export async function POST(req:Request) {
 const c=await context();if(c.error)return c.error;
 const input=await req.json().catch(()=>({}));
 const token=typeof input.pageToken==="string"?input.pageToken.trim():"";
 if(!token||token.length>4096)return NextResponse.json({error:"Valid Page access token required."},{status:400});
 const appId=process.env.NEXT_PUBLIC_META_APP_ID,secret=process.env.META_APP_SECRET;
 if(!appId||!secret)return NextResponse.json({error:"Meta app is not configured."},{status:503});
 const version=process.env.WHATSAPP_API_VERSION||"v26.0";
 const base="https://graph.facebook.com/"+version;
 try {
  const checked=await fetch(base+"/debug_token?input_token="+encodeURIComponent(token),{headers:{Authorization:"Bearer "+appId+"|"+secret},cache:"no-store"});
  const debug=(await checked.json()).data;
  if(!checked.ok||!debug?.is_valid||debug.app_id!==appId||!debug.scopes?.includes("leads_retrieval")||!debug.scopes?.includes("pages_manage_metadata"))return NextResponse.json({error:"Token must belong to this Meta app and include leads_retrieval and pages_manage_metadata."},{status:400});
  const me=await fetch(base+"/me?fields=id,name,category",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
  const page=await me.json();
  if(!me.ok||!/^\d+$/.test(page.id)||!page.category)return NextResponse.json({error:"A Page access token is required, not a personal user token."},{status:400});
  const ref=c.db!.collection("crm_facebook_pages").doc(page.id);
  const allowed=await c.db!.runTransaction(async tx=>{
   const previous=await tx.get(ref);
   if(previous.exists&&previous.data()?.userId!==c.user!.email)return false;
   tx.set(ref,{userId:c.user!.email,name:String(page.name||"Facebook Page"),token:encryptCredential(token),status:"pending",updatedAt:new Date().toISOString()},{merge:true});
   return true;
  });
  if(!allowed)return NextResponse.json({error:"This Page is already assigned to another workspace."},{status:409});
  const sub=await fetch(base+"/"+page.id+"/subscribed_apps",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({subscribed_fields:["leadgen"]}),cache:"no-store"});
  const result=await sub.json();
  if(!sub.ok||result.success!==true){await ref.update({status:"subscription_failed"});return NextResponse.json({error:"Meta did not enable leadgen. Check app review, Page access and webhook setup."},{status:502});}
  await ref.update({status:"subscribed"});
  return NextResponse.json({page:{id:page.id,name:page.name,status:"subscribed"}});
 }catch{return NextResponse.json({error:"Facebook connection failed. No token details are exposed."},{status:502});}
}
