import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { getDb, findUser } from "@/lib/db";
import { accessState } from "@/lib/entitlements";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ authenticated: false });

  let plan = session.plan as string;
  let trialEndsAt = session.trialEndsAt;
  let phoneNumberId: string | null = null;
  let wabaId: string | null = null;
  let registered = false;
  let name = session.name;

  const db = getDb();
  let storedUser = null as Awaited<ReturnType<typeof findUser>>;
  if (db) {
    storedUser = await findUser(db, session.sub);
    if (storedUser) {
      plan = storedUser.plan;
      trialEndsAt = storedUser.trial_ends_at;
      phoneNumberId = storedUser.phone_number_id;
      wabaId = storedUser.waba_id;
      registered = storedUser.wa_registered !== false && Boolean(storedUser.phone_number_id);
      name = storedUser.name || name;
    }
  }

  const access = accessState({ plan, trial_ends_at: trialEndsAt });
  if (access.reason === "suspended") {
    return NextResponse.json({ authenticated: false, suspended: true });
  }

  const activationPending = Boolean(phoneNumberId) && !registered;

  return NextResponse.json({
    authenticated: true,
    name,
    email: session.sub,
    plan,
    accessStatus: access.reason,
    trialEndsAt,
    accessEndsAt: access.accessEndsAt,
    daysLeft: access.daysLeft,
    readOnly: access.readOnly,
    activeAccess: access.active,
    connected: Boolean(phoneNumberId) && registered,
    activationPending,
    phoneNumberId,
    wabaId,
  });
}
