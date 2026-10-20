// Firebase Firestore data layer (replaces Supabase).
// Server-side only — uses the Firebase Admin SDK with a service account,
// which bypasses Firestore security rules (keep the DB locked down).
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export type AppUser = {
  id: string; // Firestore doc id (the lowercased email)
  email: string;
  name: string | null;
  password_hash: string;
  plan: "trial" | "paid" | "free" | "expired" | "suspended" | string;
  trial_ends_at: string; // ISO
  waba_id: string | null;
  phone_number_id: string | null;
  wa_token: string | null;
  // Embedded Signup activation state. Optional for older user documents.
  wa_registered?: boolean;
  // Server-generated Cloud API two-step registration PIN, encrypted at rest.
  wa_registration_pin?: string | null;
  wa_registration_error?: string | null;
  wa_connected_at?: string | null;
  // Optional workspace/company profile fields.
  company_name?: string | null;
  company_phone?: string | null;
  company_website?: string | null;
  company_city?: string | null;
  company_industry?: string | null;
  company_address?: string | null;
  created_at: string; // ISO
};

let cached: Firestore | null = null;

function loadServiceAccount():
  | { projectId: string; clientEmail: string; privateKey: string }
  | null {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT || null;
  if (!raw && process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      raw = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
    } catch {
      return null;
    }
  }
  if (!raw) return null;
  try {
    const svc = JSON.parse(raw);
    if (!svc.project_id || !svc.client_email || !svc.private_key) return null;
    return {
      projectId: svc.project_id,
      clientEmail: svc.client_email,
      privateKey: String(svc.private_key).replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

export function getDb(): Firestore | null {
  if (cached) return cached;
  const creds = loadServiceAccount();
  if (!creds) return null;
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: creds.projectId,
        clientEmail: creds.clientEmail,
        privateKey: creds.privateKey,
      }),
    });
  cached = getFirestore(app);
  return cached;
}

const USERS = "users";

export function normEmail(email: string): string {
  return String(email).trim().toLowerCase();
}

export async function findUser(db: Firestore, email: string): Promise<AppUser | null> {
  const snap = await db.collection(USERS).doc(normEmail(email)).get();
  if (!snap.exists) return null;
  const d = snap.data() as Omit<AppUser, "id">;
  return { id: snap.id, ...d };
}

export async function createUser(db: Firestore, u: Omit<AppUser, "id">): Promise<void> {
  // Firestore create() fails when the document already exists, closing the
  // race where two concurrent signups for the same email could overwrite an
  // existing password hash with set().
  await db.collection(USERS).doc(normEmail(u.email)).create(u);
}

export async function updateUser(
  db: Firestore,
  email: string,
  updates: Partial<Omit<AppUser, "id" | "email">>
): Promise<AppUser | null> {
  const ref = db.collection(USERS).doc(normEmail(email));
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.update(updates);
  const after = await ref.get();
  return { id: after.id, ...(after.data() as Omit<AppUser, "id">) };
}

export async function listUsers(db: Firestore): Promise<AppUser[]> {
  const snap = await db.collection(USERS).orderBy("created_at", "desc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<AppUser, "id">) }));
}
