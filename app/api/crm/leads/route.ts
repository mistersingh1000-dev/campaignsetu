import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { findUser, getDb } from "@/lib/db";
import { accessState } from "@/lib/entitlements";
import { cleanLead, saveLead } from "@/lib/crm-db";
export const runtime = "nodejs";
async function context(write = false) {
  const session = await verifySession((await cookies()).get(COOKIE_NAME)?.value);
  if (!session) return { error: NextResponse.json({error:"Please sign in."},{status:401}) };
  const db = getDb();
  if (!db) return { error: NextResponse.json({error:"Database unavailable."},{status:503}) };
  const user = await findUser(db, session.sub);
  if (!user) return { error: NextResponse.json({error:"Account not found."},{status:404}) };
  if (write && !accessState(user).active) return {error:NextResponse.json({error:"An active plan is required."},{status:403})};
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
  catch { return NextResponse.json({error:"Enter a name, valid contact details, date and deal value."},{status:400}); }
}
export async function PATCH(req: Request) {
  const c = await context(true); if(c.error) return c.error;
  const input = await req.json().catch(()=>null);
  if (!input || typeof input.id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(input.id)) return NextResponse.json({error:"Invalid lead."},{status:400});
  const ref = c.db!.collection("crm_leads").doc(input.id);
  try {
    const result = await c.db!.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.data()?.userId !== c.userId) return null;
      const fields = cleanLead(input);
      tx.update(ref,{...fields,updatedAt:new Date().toISOString()});
      return {...snap.data(),...fields};
    });
    return result ? NextResponse.json({lead:result}) : NextResponse.json({error:"Lead not found."},{status:404});
  } catch { return NextResponse.json({error:"Invalid lead details."},{status:400}); }
}
