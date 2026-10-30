import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";
import { decryptCredential } from "@/lib/credential-crypto";
import { saveLead } from "@/lib/crm-db";
export const runtime="nodejs";
export async function GET(req:Request) {
 const p=new URL(req.url).searchParams;
 const expected=process.env.FACEBOOK_LEAD_WEBHOOK_TOKEN;
 return p.get("hub.mode")==="subscribe"&&expected&&p.get("hub.verify_token")===expected
 ?new NextResponse(p.get("hub.challenge")||""):NextResponse.json({error:"Invalid verification token."},{status:403});
}
export async function POST(req:Request) {
 const raw=await req.text(),secret=process.env.META_APP_SECRET;
 if(!secret)return NextResponse.json({error:"Meta security unavailable."},{status:503});
 const actual=Buffer.from(req.headers.get("x-hub-signature-256")||"");
 const expected=Buffer.from("sha256="+createHmac("sha256",secret).update(raw).digest("hex"));
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return NextResponse.json({error:"Invalid signature."},{status:401});
 const db=getDb();if(!db)return NextResponse.json({error:"Database unavailable."},{status:503});
 let body:any;try{body=JSON.parse(raw);}catch{return NextResponse.json({error:"Invalid payload."},{status:400});}
 if(body.object!=="page")return NextResponse.json({ok:true});
 try {
  for(const entry of body.entry||[]) {
   const pageId=String(entry.id||"");
   if(!/^\d+$/.test(pageId))continue;
   const mapping=await db.collection("crm_facebook_pages").doc(pageId).get();
   if(!mapping.exists)continue;
   const owner=mapping.data()!;
   for(const change of entry.changes||[]) {
    if(change.field!=="leadgen")continue;
    const id=String(change.value?.leadgen_id||"");
    if(!/^\d+$/.test(id)||String(change.value?.page_id||pageId)!==pageId)continue;
    const token=decryptCredential(owner.token);
    if(!token)throw Error("missing_token");
    const version=process.env.WHATSAPP_API_VERSION||"v26.0";
    const response=await fetch("https://graph.facebook.com/"+version+"/"+id+"?fields=id,field_data,form_id,created_time",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
    const lead=await response.json();
    if(!response.ok||lead.id!==id||!Array.isArray(lead.field_data))throw Error("lead_fetch_failed");
    const fields:Record<string,string>={};
    for(const field of lead.field_data)if(typeof field.name==="string"&&Array.isArray(field.values))fields[field.name]=String(field.values[0]||"");
    await saveLead(db,owner.userId,{name:fields.full_name||[fields.first_name,fields.last_name].filter(Boolean).join(" ")||"Facebook lead",phone:fields.phone_number||"",email:fields.email||"",notes:"Form: "+String(lead.form_id||"")+"\n"+lead.field_data.map((f:any)=>String(f.name)+": "+(Array.isArray(f.values)?f.values.join(", "):"")).join("\n")},id);
    await mapping.ref.update({lastLeadReceivedAt:new Date().toISOString()});
   }
  }
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Lead import failed; retry required."},{status:503});}
}
