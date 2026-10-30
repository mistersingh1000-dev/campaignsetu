import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { findUser, getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createSupportTicket, updateSupportTicket } from "@/lib/support-tickets";
export const runtime="nodejs";
async function context(req?:Request){
 if(req){const site=process.env.NEXT_PUBLIC_SITE_URL;if(!site||req.headers.get("origin")!==new URL(site).origin)return {error:NextResponse.json({error:"Invalid request origin."},{status:403})};}
 const s=await verifySession((await cookies()).get(COOKIE_NAME)?.value);if(!s)return {error:NextResponse.json({error:"Sign in required."},{status:401})};
 const db=getDb();if(!db)return {error:NextResponse.json({error:"Database unavailable."},{status:503})};
 const user=await findUser(db,s.sub);if(!user)return {error:NextResponse.json({error:"Account not found."},{status:404})};return {db,user};
}
export async function GET(){const c=await context();if(c.error)return c.error;const snap=await c.db!.collection("support_tickets").where("userId","==",c.user!.email).get();return NextResponse.json({tickets:snap.docs.map(d=>d.data()).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,100)},{headers:{"Cache-Control":"no-store"}});}
export async function POST(req:Request){const c=await context(req);if(c.error)return c.error;const limit=await consumeRateLimit(c.db!,"support-create",c.user!.email,5,3600000);if(!limit.allowed)return NextResponse.json({error:"Too many new tickets. Please wait before raising another."},{status:429});try{return NextResponse.json({ticket:await createSupportTicket(c.db!,c.user!,await req.json())},{status:201});}catch(e:any){return NextResponse.json({error:e.message||"Unable to save ticket."},{status:400});}}
export async function PATCH(req:Request){const c=await context(req);if(c.error)return c.error;const limit=await consumeRateLimit(c.db!,"support-reply",c.user!.email,30,3600000);if(!limit.allowed)return NextResponse.json({error:"Too many replies. Please wait."},{status:429});try{const input=await req.json(),ticket=await updateSupportTicket(c.db!,String(input.id||""),c.user!.email,false,input);return ticket?NextResponse.json({ticket}):NextResponse.json({error:"Ticket not found."},{status:404});}catch(e:any){return NextResponse.json({error:e.message||"Unable to update ticket."},{status:400});}}
