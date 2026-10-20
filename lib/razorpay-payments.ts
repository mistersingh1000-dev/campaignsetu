import type { Firestore } from "firebase-admin/firestore";

export type RazorpayOrderRecord = {
  id: string;
  userId: string;
  userName: string | null;
  planId: string;
  planName: string;
  amountPaise: number;
  currency: "INR";
  months: number;
  status: "created" | "paid";
  paymentId: string | null;
  createdAt: string;
  paidAt: string | null;
  validUntil: string | null;
  activationSource: "browser" | "webhook" | null;
};

const COLLECTION = "razorpay_orders";

export async function saveRazorpayOrder(
  db: Firestore,
  record: RazorpayOrderRecord
): Promise<void> {
  await db.collection(COLLECTION).doc(record.id).create(record);
}

export async function getRazorpayOrder(
  db: Firestore,
  orderId: string
): Promise<RazorpayOrderRecord | null> {
  const snap = await db.collection(COLLECTION).doc(orderId).get();
  return snap.exists ? (snap.data() as RazorpayOrderRecord) : null;
}

export async function activateRazorpayOrder(
  db: Firestore,
  orderId: string,
  paymentId: string,
  source: "browser" | "webhook"
): Promise<{ record: RazorpayOrderRecord; validUntil: string; alreadyPaid: boolean } | null> {
  const orderRef = db.collection(COLLECTION).doc(orderId);

  return db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) return null;
    const order = orderSnap.data() as RazorpayOrderRecord;

    if (order.status === "paid") {
      return {
        record: order,
        validUntil: order.validUntil || "",
        alreadyPaid: true,
      };
    }

    const userRef = db.collection("users").doc(String(order.userId).trim().toLowerCase());
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new Error("user_not_found");

    const user = userSnap.data() as any;
    const now = new Date();
    const currentExpiry = new Date(user?.trial_ends_at || 0);
    const base = currentExpiry > now ? new Date(currentExpiry) : now;
    base.setMonth(base.getMonth() + order.months);
    const validUntil = base.toISOString();
    const paidAt = new Date().toISOString();

    tx.update(userRef, { plan: "paid", trial_ends_at: validUntil });
    tx.update(orderRef, {
      status: "paid",
      paymentId,
      paidAt,
      validUntil,
      activationSource: source,
    });

    return {
      record: {
        ...order,
        status: "paid",
        paymentId,
        paidAt,
        validUntil,
        activationSource: source,
      },
      validUntil,
      alreadyPaid: false,
    };
  });
}
