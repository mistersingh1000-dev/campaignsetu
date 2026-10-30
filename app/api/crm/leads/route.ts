import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { findUser, getDb } from "@/lib/db";
import { crmAccess, CrmPlanError } from "@/lib/crm-plans";
import { cleanLead, saveLead } from "@/lib/crm-db";
import { defaultSettings, type CrmSettings } from "@/lib/crm-settings";
export const runtime = "nodejs";
async function context(write = false) {
  const session = await verifySession((await cookies()).get(COOKIE_NAME)?.value);
  if (!session) return { error: NextResponse.json({error:"Please sign in."},{status:401}) };
  const db = getDb();
  if (!db) return { error: NextResponse.json({error:"Database unavailable."},{status:503}) };
  const user = await findUser(db, session.sub);
  if (!user) return { error: NextResponse.json({error:"Account not found."},{status:404}) };
  if (write && !crmAccess(user).active) return {error:NextResponse.json({error:"An active CRM trial or subscription is required."},{status:403})};
  return { db, userId: user.email };
}
export async function GET(req: Request) {
  const c = await context(); if(c.error) return c.error;
  const limit = 100;
  const after = new URL(req.url).searchParams.get("after");
  let query = c.db!.collection("crm_leads").where("userId","==",c.userId!).orderBy("__name__").limit(limit + 1);
  if(after) query = query.startAfter(after);
  const snap = await query.get();
  const leads = snap.docs.slice(0,limit).map(d=>d.data());
  return NextResponse.json({leads, next: snap.size > limit ? snap.docs[limit-1].id : null});
}
export async function POST(req: Request) {
  const c = await context(true); if(c.error) return c.error;
  try { const lead = await saveLead(c.db!, c.userId!, await req.json()); return NextResponse.json({lead},{status:201}); }
  catch(e) { return e instanceof CrmPlanError ? NextResponse.json({error:e.message,code:e.code,upgrade:"/crm-pricing"},{status:402}) : NextResponse.json({error:"Enter a name, valid contact details, date and deal value."},{status:400}); }
}
export async function PATCH(req: Request) {
  const c = await context(true); if(c.error) return c.error;
  const input = await req.json().catch(()=>null);
  if (!input || typeof input.id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(input.id)) return NextResponse.json({error:"Invalid lead."},{status:400});
  const ref = c.db!.collection("crm_leads").doc(input.id);
  try {
    const config=await c.db!.collection("crm_settings").doc(c.userId!).get();
    const result = await c.db!.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.data()?.userId !== c.userId) return null;
      const current=snap.data()!;
      const fields = cleanLead(input, !current.facebookLeadId, (config.data() as CrmSettings)||defaultSettings);
      if(current.facebookLeadId) fields.source="Facebook Lead Ads";
      const now=new Date().toISOString();
      const changed=["stage","notes","followUpAt","followUpDone","value","tags","customValues","source"].filter(k=>JSON.stringify(current[k])!==JSON.stringify((fields as any)[k]));
      const activity=[...(current.activity||[]),...(changed.length?[{at:now,text:"Updated: "+changed.join(", ")}]:[])].slice(-50);
      tx.update(ref,{...fields,activity,updatedAt:now});
      return {...current,...fields,activity,updatedAt:now};
    });
    return result ? NextResponse.json({lead:result}) : NextResponse.json({error:"Lead not found."},{status:404});
  } catch { return NextResponse.json({error:"Invalid lead details."},{status:400}); }
}
