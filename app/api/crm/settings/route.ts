import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { getDb, findUser } from "@/lib/db";
import { accessState } from "@/lib/entitlements";
import { cleanSettings, defaultSettings } from "@/lib/crm-settings";
export const runtime="nodejs";
async function context(write=false){
 const s=await verifySession((await cookies()).get(COOKIE_NAME)?.value);
 if(!s)return {error:NextResponse.json({error:"Sign in required."},{status:401})};
 const db=getDb();if(!db)return {error:NextResponse.json({error:"Database unavailable."},{status:503})};
 const u=await findUser(db,s.sub);if(!u)return {error:NextResponse.json({error:"Account unavailable."},{status:404})};
 if(write&&!accessState(u).active)return {error:NextResponse.json({error:"Active plan required."},{status:403})};
 return {db,ref:db.collection("crm_settings").doc(u.email)};
}
export async function GET(){const c=await context();if(c.error)return c.error;const snap=await c.ref!.get();return NextResponse.json({settings:snap.exists?snap.data():defaultSettings});}
export async function PUT(req:Request){
 const c=await context(true);if(c.error)return c.error;
 try {
  const settings=cleanSettings(await req.json());
  await c.db!.runTransaction(async tx=>{
   const previous=await tx.get(c.ref!);
   const old=previous.data()?.fields||[];
   for(const field of old){const next=settings.fields.find(f=>f.id===field.id);if(!next||next.type!==field.type)throw Error("Existing field keys and types must be preserved.");}
   tx.set(c.ref!,settings);
  });
  return NextResponse.json({settings});
 }catch{return NextResponse.json({error:"Check custom fields: unique keys, valid types and select options are required. Existing field keys and types cannot be removed or changed."},{status:400});}
}
