import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { getDb, findUser } from "@/lib/db";
import { crmAccess, requireCrmAccess, CrmPlanError } from "@/lib/crm-plans";
import { cleanSettings, defaultSettings, getPipeline } from "@/lib/crm-settings";
export const runtime="nodejs";
async function context(write=false){
 const s=await verifySession((await cookies()).get(COOKIE_NAME)?.value);
 if(!s)return {error:NextResponse.json({error:"Sign in required."},{status:401})};
 const db=getDb();if(!db)return {error:NextResponse.json({error:"Database unavailable."},{status:503})};
 const u=await findUser(db,s.sub);if(!u)return {error:NextResponse.json({error:"Account unavailable."},{status:404})};
 if(write&&!crmAccess(u).active)return {error:NextResponse.json({error:"Active plan required."},{status:403})};
 return {db,user:u,ref:db.collection("crm_settings").doc(u.email)};
}
export async function GET(){const c=await context();if(c.error)return c.error;const snap=await c.ref!.get();return NextResponse.json({settings:snap.exists?snap.data():defaultSettings});}
export async function PUT(req:Request){
 const c=await context(true);if(c.error)return c.error;
 try {
  const settings=cleanSettings(await req.json());
  await c.db!.runTransaction(async tx=>{
   const [previous,account]=await Promise.all([tx.get(c.ref!),tx.get(c.db!.collection("users").doc(c.user!.email))]);
   requireCrmAccess(account.data()||{});
   const old=previous.data()?.fields||[];
   const limits=crmAccess(account.data()||{}).limits;
   if(settings.fields.length>limits.fields && settings.fields.length>old.length)throw new CrmPlanError("crm_limit_reached",`Your plan allows ${limits.fields} custom fields. Upgrade to add more.`);
   const oldTemplates=previous.data()?.emailTemplates || [];
   if((settings.emailTemplates?.length||0)>limits.templates && (settings.emailTemplates?.length||0)>oldTemplates.length)throw new CrmPlanError("crm_limit_reached",`Your plan allows ${limits.templates} email templates. Upgrade to add more.`);
   for(const field of old){const next=settings.fields.find(f=>f.id===field.id);if(!next||next.type!==field.type)throw Error("Existing field keys and types must be preserved.");}
   const previousStages=getPipeline(previous.exists?previous.data() as any:defaultSettings);
   for(const stage of previousStages)if(!settings.pipeline?.some(p=>p.id===stage.id))throw Error("Existing stage keys must be preserved.");
   tx.set(c.ref!,settings);
  });
  return NextResponse.json({settings});
 }catch(e){if(e instanceof CrmPlanError)return NextResponse.json({error:e.message,code:e.code},{status:402});return NextResponse.json({error:"Check custom fields: unique keys, valid types and select options are required. Existing field keys/types and stage keys cannot be removed or changed."},{status:400});}
}
