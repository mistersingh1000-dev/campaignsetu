import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { findUser, getDb } from "@/lib/db";
import { whatsappApiToken } from "@/lib/whatsapp-auth";

export const runtime = "nodejs";

/**
 * Read-only connection diagnostic for the currently authenticated workspace.
 * "Connected" in Firestore is NOT proof of Meta webhook delivery or App Review.
 * Never return a business token, raw Graph error, or another workspace's number.
 */
export async function GET() {
  const session=await verifySession((await cookies()).get(COOKIE_NAME)?.value);
  if(!session) return NextResponse.json({error:"not_authenticated"},{status:401});
  const db=getDb();
  if(!db) return NextResponse.json({error:"database_unavailable"},{status:503});
  const user=await findUser(db,session.sub);
  if(!user) return NextResponse.json({error:"account_not_found"},{status:404});
  const connected=user.wa_registered===true&&Boolean(user.phone_number_id);
  const result:{
    connected:boolean;coexistence:boolean;
    phone:"confirmed"|"unavailable"|"not_connected";
    routing:"unique"|"missing"|"ambiguous"|"not_checked";
    webhookApp:"confirmed"|"not_seen"|"unavailable"|"not_checked";
    inboxDelivery:"requires_real_message_test";mobileEcho:"requires_real_message_test";
    steps:string[];
  }={
    connected,coexistence:(user as any).wa_coexistence===true,
    phone:connected?"unavailable":"not_connected",
    routing:"not_checked",webhookApp:"not_checked",
    inboxDelivery:"requires_real_message_test",
    mobileEcho:"requires_real_message_test",steps:[]
  };
  if(!connected){
    result.steps.push("Use Channels > Connect WhatsApp to complete an eligible Meta-hosted signup.");
    return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
  }
  const phoneId=String(user.phone_number_id);
  const matching=await db.collection("users").where("phone_number_id","==",phoneId).limit(2).get();
  result.routing=matching.docs.length===1&&matching.docs[0].data()?.email===user.email?"unique":matching.docs.length===0?"missing":"ambiguous";
  if(result.routing!=="unique")result.steps.push("The number is not uniquely routed to this workspace. Contact support; do not reconnect it repeatedly.");
  let token:string|null=null;
  try{token=whatsappApiToken(user);}catch{}
  if(!token){
    result.steps.push("A usable WhatsApp API token is missing. Complete onboarding or request administrator recovery.");
    return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
  }
  const version=process.env.WHATSAPP_API_VERSION||"v26.0";
  const read=async(path:string)=>{
    const r=await fetch("https://graph.facebook.com/"+version+"/"+path,{
      headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(8000)});
    const j=await r.json().catch(()=>({}));
    return {ok:r.ok,json:j};
  };
  try{
    const p=await read(encodeURIComponent(phoneId)+"?fields=id,display_phone_number");
    result.phone=p.ok&&String(p.json?.id||"")===phoneId?"confirmed":"unavailable";
  }catch{result.phone="unavailable";}
  if(result.phone!=="confirmed")result.steps.push("Meta did not verify this saved phone number with the current API token.");
  const wabaId=String(user.waba_id||"");
  if(/^\d+$/.test(wabaId)){
    try{
      const a=await read(encodeURIComponent(wabaId)+"/subscribed_apps?limit=100");
      if(a.ok&&Array.isArray(a.json?.data)){
        const app=String(process.env.NEXT_PUBLIC_META_APP_ID||"");
        result.webhookApp=a.json.data.some((x:any)=>app&&String(x?.id||x?.app_id||"")===app)?"confirmed":"not_seen";
      }else result.webhookApp="unavailable";
    }catch{result.webhookApp="unavailable";}
    if(result.webhookApp!=="confirmed")result.steps.push("Cannot confirm this app in Meta WABA webhook subscriptions. Check subscribed_apps in Meta.");
  }else {
    result.steps.push("A verified WABA ID is missing from the saved connection.");
  }
  result.steps.push("Send one consented test message from another number, verify it appears in CampaignSetu Inbox, then reply from the Business App and panel.");
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
}
