import { NextResponse } from "next/server";
import { crmRequestContext } from "@/lib/crm-request-context";
import { requestCoexistenceSync } from "@/lib/coexistence-sync-request";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: Request) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin || req.headers.get("origin") !== new URL(origin).origin) return NextResponse.json({error:"invalid_origin"},{status:403});
  const ctx = await crmRequestContext();
  if (ctx.error) return ctx.error;
  try { return NextResponse.json(await requestCoexistenceSync(ctx.db!,ctx.user!.email)); }
  catch { return NextResponse.json({error:"sync_unavailable",message:"Confirm an eligible coexistence connection within its 24-hour sync window. An uncertain request needs support review."},{status:409}); }
}
