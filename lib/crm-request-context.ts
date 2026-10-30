import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, verifySession } from "./auth";
import { getDb, findUser } from "./db";
import { crmAccess } from "./crm-plans";
export async function crmRequestContext() {
 const session=await verifySession((await cookies()).get(COOKIE_NAME)?.value);
 if(!session)return {error:NextResponse.json({error:"Sign in required."},{status:401})};
 const db=getDb();if(!db)return {error:NextResponse.json({error:"Database unavailable."},{status:503})};
 const user=await findUser(db,session.sub);
 if(!user||!crmAccess(user).active)return {error:NextResponse.json({error:"Active CRM trial or subscription required."},{status:403})};
 return {db,user};
}
