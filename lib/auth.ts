import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const COOKIE_NAME = "wcp_session";
export const TRIAL_DAYS = Number(process.env.TRIAL_DAYS || 7);
export const SESSION_DAYS = 30;

export type Session = JWTPayload & {
  sub: string;
  name: string;
  plan: "trial" | "free" | "paid" | "expired";
  trialEndsAt: string;
};

function authSecret(): Uint8Array | null {
  const configured = process.env.AUTH_SECRET?.trim();
  if (configured) return new TextEncoder().encode(configured);

  // A deterministic fallback is acceptable only for local development. In
  // production, missing AUTH_SECRET must never silently create forgeable JWTs.
  if (process.env.NODE_ENV !== "production") {
    return new TextEncoder().encode("dev-only-secret-change-before-production");
  }
  return null;
}

export function authConfigured(): boolean {
  return Boolean(authSecret());
}

export async function createSession(data: {
  email: string;
  name: string;
  plan?: Session["plan"];
  trialEndsAt: string;
}) {
  const secret = authSecret();
  if (!secret) throw new Error("AUTH_SECRET is not configured");

  return new SignJWT({
    name: data.name,
    plan: data.plan ?? "trial",
    trialEndsAt: data.trialEndsAt,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(data.email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret);
}

export async function verifySession(token?: string): Promise<Session | null> {
  if (!token) return null;
  const secret = authSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as Session;
  } catch {
    return null;
  }
}

export function trialDaysLeft(trialEndsAt: string): number {
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function newTrialEnd(): string {
  return new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString();
}
