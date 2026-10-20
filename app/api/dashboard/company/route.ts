import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { findUser, getDb, updateUser } from "@/lib/db";

export const runtime = "nodejs";

async function currentEmail() {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  return session?.sub || null;
}

const clean = (value: unknown, max = 160) => String(value ?? "").trim().slice(0, max);

export async function GET() {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "database_unavailable", message: "Database is not configured." }, { status: 503 });
  const user = await findUser(db, email);
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  return NextResponse.json({
    company: {
      name: user.company_name || "",
      phone: user.company_phone || "",
      website: user.company_website || "",
      city: user.company_city || "",
      industry: user.company_industry || "",
      address: user.company_address || "",
    },
  });
}

export async function PATCH(req: Request) {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const db = getDb();
  if (!db) return NextResponse.json({ error: "database_unavailable", message: "Database is not configured." }, { status: 503 });

  const updated = await updateUser(db, email, {
    company_name: clean(body.name, 120) || null,
    company_phone: clean(body.phone, 40) || null,
    company_website: clean(body.website, 200) || null,
    company_city: clean(body.city, 100) || null,
    company_industry: clean(body.industry, 120) || null,
    company_address: clean(body.address, 300) || null,
  });

  if (!updated) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
