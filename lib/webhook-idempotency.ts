import type { Firestore } from "firebase-admin/firestore";

export async function whatsappMessageAlreadyProcessed(
  db: Firestore,
  waMessageId: string | null | undefined
): Promise<boolean> {
  if (!waMessageId) return false;
  const snap = await db
    .collection("messages")
    .where("waMessageId", "==", waMessageId)
    .limit(1)
    .get();
  return !snap.empty;
}
