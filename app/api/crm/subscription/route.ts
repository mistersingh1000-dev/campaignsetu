import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { findUser, getDb } from "@/lib/db";
import { crmAccess } from "@/lib/crm-plans";
export const runtime="nodejs";
export async function GET(){
 const session=await verifySession((await cookies()).get(COOKIE_NAME)?.value);if(!session)return NextResponse.json({error:"Sign in required."},{status:401});
 const db=getDb();if(!db)return NextResponse.json({error:"Database unavailable."},{status:503});
 const user=await findUser(db,session.sub);if(!user)return NextResponse.json({error:"Account not found."},{status:404});
 const [leads,pages,settings]=await Promise.all([db.collection("crm_leads").where("userId","==",user.email).count().get(),db.collection("crm_facebook_pages").where("userId","==",user.email).count().get(),db.collection("crm_settings").doc(user.email).get()]);
 return NextResponse.json({access:crmAccess(user),usage:{leads:leads.data().count,pages:pages.data().count,fields:settings.data()?.fields?.length||0,templates:settings.data()?.emailTemplates?.length||0}},{headers:{"Cache-Control":"no-store"}});
}
