import { createHash, randomBytes } from "crypto";
import type { Firestore } from "firebase-admin/firestore";
import { normEmail } from "@/lib/db";

const TOKENS = "password_reset_tokens";
const LIMITS = "password_reset_limits";
const RESET_TTL_MS = 30 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function limiterId(email: string): string {
  return sha256(normEmail(email));
}

export async function issuePasswordResetToken(
  db: Firestore,
  email: string
): Promise<string | null> {
  const cleanEmail = normEmail(email);
  const token = randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const now = Date.now();
  const expiresAt = new Date(now + RESET_TTL_MS).toISOString();
  const limitRef = db.collection(LIMITS).doc(limiterId(cleanEmail));
  const tokenRef = db.collection(TOKENS).doc(tokenHash);

  const allowed = await db.runTransaction(async (tx) => {
    const limitSnap = await tx.get(limitRef);
    const nextAllowed = Number(limitSnap.data()?.next_allowed_at_ms || 0);
    if (nextAllowed > now) return false;

    tx.set(limitRef, {
      email: cleanEmail,
      latest_token_hash: tokenHash,
      next_allowed_at_ms: now + REQUEST_COOLDOWN_MS,
      updated_at: new Date(now).toISOString(),
    });
    tx.set(tokenRef, {
      email: cleanEmail,
      expires_at: expiresAt,
      created_at: new Date(now).toISOString(),
      used_at: null,
    });
    return true;
  });

  return allowed ? token : null;
}

export async function consumePasswordResetToken(
  db: Firestore,
  token: string,
  newPasswordHash: string
): Promise<boolean> {
  const tokenHash = sha256(token);
  const tokenRef = db.collection(TOKENS).doc(tokenHash);

  return db.runTransaction(async (tx) => {
    const tokenSnap = await tx.get(tokenRef);
    if (!tokenSnap.exists) return false;

    const data = tokenSnap.data() as {
      email?: string;
      expires_at?: string;
      used_at?: string | null;
    };
    const email = normEmail(data.email || "");
    if (!email || data.used_at) return false;
    if (!data.expires_at || new Date(data.expires_at).getTime() <= Date.now()) return false;

    const limitRef = db.collection(LIMITS).doc(limiterId(email));
    const limitSnap = await tx.get(limitRef);
    if (limitSnap.data()?.latest_token_hash !== tokenHash) return false;

    const userRef = db.collection("users").doc(email);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) return false;

    tx.update(userRef, { password_hash: newPasswordHash });
    tx.update(tokenRef, { used_at: new Date().toISOString() });
    tx.set(
      limitRef,
      {
        latest_token_hash: null,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  });
}
