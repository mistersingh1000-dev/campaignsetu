import { createHash, randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { decryptCredential, encryptCredential } from "./credential-crypto";

type Pending = { wabaId: string; phoneId: string | null; encryptedToken: string; leaseId?: string | null; leaseUntil?: number };
export function pendingId(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase(), "utf8").digest("hex");
}
function pendingRef(db: Firestore, email: string) {
  return db.collection("wa_coexistence_pending").doc(pendingId(email));
}

export async function hasPendingCoexistence(db: Firestore, email: string): Promise<boolean> {
  return (await pendingRef(db, email).get()).exists;
}

// Never replace a pending account or the user's current connection.
export async function stageCoexistence(db: Firestore, email: string, wabaId: string, phoneId: string | null, token: string): Promise<boolean> {
  const ref = pendingRef(db, email);
  const encryptedToken = encryptCredential(token);
  return db.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    if (current.exists) return false;
    tx.create(ref, { wabaId, phoneId, encryptedToken, createdAt: new Date().toISOString(), leaseId: null, leaseUntil: 0 });
    return true;
  });
}

export async function claimCoexistence(db: Firestore, email: string): Promise<{ leaseId: string; wabaId: string; phoneId: string | null; token: string } | null> {
  const ref = pendingRef(db, email);
  const leaseId = randomUUID();
  const item = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const value = snap.data() as Pending;
    if (value.leaseId && (value.leaseUntil || 0) > Date.now()) return null;
    tx.update(ref, { leaseId, leaseUntil: Date.now() + 120000 });
    return value;
  });
  if (!item) return null;
  try {
    const token = decryptCredential(item.encryptedToken);
    if (!token) throw new Error("Pending credential is missing");
    return { leaseId, wabaId: item.wabaId, phoneId: item.phoneId, token };
  } catch (error) {
    await releaseCoexistence(db, email, leaseId);
    throw error;
  }
}

export async function releaseCoexistence(db: Firestore, email: string, leaseId: string): Promise<void> {
  const ref = pendingRef(db, email);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists && snap.data()?.leaseId === leaseId) tx.update(ref, { leaseId: null, leaseUntil: 0 });
  });
}

export async function finishCoexistence(db: Firestore, email: string, leaseId: string, phoneId: string): Promise<"ok" | "conflict" | "stale"> {
  const normalized = email.trim().toLowerCase();
  const pending = pendingRef(db, email);
  const owner = db.collection("users").doc(normalized);
  const claim = db.collection("wa_phone_owners").doc(phoneId);
  // Avoid taking a number previously connected to a different user by older code.
  const existingOwners = db.collection("users").where("phone_number_id", "==", phoneId).limit(2);
  return db.runTransaction(async (tx) => {
    const [p, u, c, existing] = await Promise.all([tx.get(pending), tx.get(owner), tx.get(claim), tx.get(existingOwners)]);
    if (existing.docs.some((doc) => doc.id !== normalized)) return "conflict";
    if (!p.exists || p.data()?.leaseId !== leaseId) return "stale";
    if (!u.exists || (u.data()?.phone_number_id && u.data()?.phone_number_id !== phoneId) || (c.exists && c.data()?.userId !== normalized)) return "conflict";
    const item = p.data() as Pending;
    tx.set(claim, { userId: normalized }, { merge: true });
    tx.update(owner, {
      waba_id: item.wabaId, phone_number_id: phoneId, wa_token: item.encryptedToken,
      wa_registered: true, wa_registration_pin: null, wa_registration_error: null, wa_connected_at: new Date().toISOString(),
    });
    tx.delete(pending);
    return "ok";
  });
}
