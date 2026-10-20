import { createHash } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

const COLLECTION = "rate_limits";

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function requestIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export async function consumeRateLimit(
  db: Firestore,
  scope: string,
  identity: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const docId = hash(`${scope}:${identity}`);
  const ref = db.collection(COLLECTION).doc(docId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as { count?: number; windowStartedAtMs?: number } | undefined;
    const started = Number(data?.windowStartedAtMs || 0);
    const expired = !started || now - started >= windowMs;

    if (expired) {
      tx.set(ref, {
        scope,
        identityHash: hash(identity),
        count: 1,
        windowStartedAtMs: now,
        expiresAt: new Date(now + windowMs).toISOString(),
        updatedAt: new Date(now).toISOString(),
      });
      return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterSeconds: 0 };
    }

    const count = Number(data?.count || 0);
    const resetAt = started + windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
    if (count >= limit) {
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    tx.update(ref, {
      count: count + 1,
      updatedAt: new Date(now).toISOString(),
    });
    return {
      allowed: true,
      remaining: Math.max(0, limit - count - 1),
      retryAfterSeconds: 0,
    };
  });
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message: "Too many attempts. Please wait a little and try again.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.max(1, retryAfterSeconds)),
      },
    }
  );
}
