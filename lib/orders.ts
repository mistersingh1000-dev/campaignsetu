// Manual UPI orders: customer pays by QR, admin approves in the dashboard.
import type { Firestore } from "firebase-admin/firestore";

export type OrderStatus = "pending" | "approved" | "rejected";

export type Order = {
  id: string;
  userId: string;
  userName: string | null;
  planId: string;
  planName: string;
  amount: number;
  months: number;
  reference: string;
  payerNote: string | null;
  status: OrderStatus;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
};

const ORDERS = "orders";
const USERS = "users";
const REFERENCE_LOCKS = "order_reference_locks";

export async function createOrder(
  db: Firestore,
  data: Omit<Order, "id" | "status" | "createdAt" | "decidedAt" | "decidedBy">
): Promise<Order> {
  const ref = db.collection(ORDERS).doc();
  const reference = data.reference.trim();
  const lockRef = db.collection(REFERENCE_LOCKS).doc(reference.toLowerCase());
  const order: Order = {
    ...data,
    reference,
    id: ref.id,
    status: "pending",
    createdAt: new Date().toISOString(),
    decidedAt: null,
    decidedBy: null,
  };

  await db.runTransaction(async (tx) => {
    const lock = await tx.get(lockRef);
    if (lock.exists) throw new Error("reference_already_used");
    tx.create(ref, order);
    tx.create(lockRef, {
      reference,
      orderId: ref.id,
      userId: data.userId,
      createdAt: order.createdAt,
    });
  });
  return order;
}

export async function getOrder(db: Firestore, id: string): Promise<Order | null> {
  const snap = await db.collection(ORDERS).doc(id).get();
  return snap.exists ? (snap.data() as Order) : null;
}

export async function findOrderByReference(
  db: Firestore,
  reference: string
): Promise<Order | null> {
  const snap = await db
    .collection(ORDERS)
    .where("reference", "==", reference.trim())
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data() as Order;
}

export async function pendingOrderFor(db: Firestore, userId: string): Promise<Order | null> {
  const snap = await db
    .collection(ORDERS)
    .where("userId", "==", userId)
    .where("status", "==", "pending")
    .get();
  if (snap.empty) return null;
  const rows = snap.docs.map((d) => d.data() as Order);
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return rows[0];
}

export async function listOrders(db: Firestore): Promise<Order[]> {
  const snap = await db.collection(ORDERS).get();
  const rows = snap.docs.map((d) => d.data() as Order);
  rows.sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
  return rows;
}

export async function decideOrder(
  db: Firestore,
  id: string,
  status: "approved" | "rejected",
  decidedBy: string
): Promise<Order | null> {
  const ref = db.collection(ORDERS).doc(id);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const order = snap.data() as Order;
    if (order.status !== "pending") throw new Error("already_decided");
    const updates = { status, decidedAt: new Date().toISOString(), decidedBy };
    tx.update(ref, updates);
    return { ...order, ...updates } as Order;
  });
}

export async function approveOrderAndExtend(
  db: Firestore,
  id: string,
  decidedBy: string
): Promise<{ order: Order; validUntil: string } | null> {
  const orderRef = db.collection(ORDERS).doc(id);

  return db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) return null;

    const order = orderSnap.data() as Order;
    if (order.status !== "pending") throw new Error("already_decided");

    const userRef = db.collection(USERS).doc(String(order.userId).trim().toLowerCase());
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new Error("user_not_found");

    const user = userSnap.data() as any;
    const now = new Date();
    const currentExpiry = new Date(user?.trial_ends_at || 0);
    const base = currentExpiry > now ? currentExpiry : now;
    base.setMonth(base.getMonth() + order.months);
    const validUntil = base.toISOString();
    const decidedAt = new Date().toISOString();

    tx.update(userRef, { plan: "paid", trial_ends_at: validUntil });
    tx.update(orderRef, { status: "approved", decidedAt, decidedBy });

    return {
      order: { ...order, status: "approved", decidedAt, decidedBy },
      validUntil,
    };
  });
}
