import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession, type Session } from "@/lib/auth";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function configuredAdminEmails(): string[] {
  const primary = process.env.ADMIN_EMAIL || "";
  const additional = process.env.ADMIN_EMAILS || "";
  return Array.from(
    new Set(
      [primary, ...additional.split(",")]
        .map(normalize)
        .filter(Boolean)
    )
  );
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const allowed = configuredAdminEmails();
  // Fail closed when no admin email is configured in production.
  return allowed.length > 0 && allowed.includes(normalize(email));
}

export async function getAdminSession(): Promise<Session | null> {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session || !isAdminEmail(session.sub)) return null;
  return session;
}
