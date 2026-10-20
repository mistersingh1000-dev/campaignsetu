import type { Firestore } from "firebase-admin/firestore";

export type CampaignStatus =
  | "draft"
  | "queued"
  | "sending"
  | "completed"
  | "completed_with_errors"
  | "cancelled";

export type Campaign = {
  id: string;
  userId: string;
  name: string;
  templateName: string;
  templateLanguage: string;
  variableValues: string[];
  audience: "all_opted_in" | "tag";
  audienceTag?: string | null;
  status: CampaignStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  deliveredCount: number;
  readCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
};

export type CampaignRecipientStatus =
  | "queued"
  | "processing"
  | "sent"
  | "failed"
  | "delivered"
  | "read";

export type CampaignRecipient = {
  id: string;
  campaignId: string;
  userId: string;
  contactId: string;
  phone: string;
  contactName: string | null;
  status: CampaignRecipientStatus;
  waMessageId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

const CAMPAIGNS = "campaigns";
const RECIPIENTS = "campaignRecipients";

function normalizeCampaign(data: any): Campaign {
  return {
    ...data,
    audience: data?.audience === "tag" ? "tag" : "all_opted_in",
    audienceTag: data?.audience === "tag" ? String(data?.audienceTag || "") || null : null,
  } as Campaign;
}

export async function createCampaign(
  db: Firestore,
  data: Omit<Campaign, "id" | "status" | "totalRecipients" | "sentCount" | "failedCount" | "deliveredCount" | "readCount" | "createdAt" | "startedAt" | "completedAt" | "lastError">
): Promise<Campaign> {
  const ref = db.collection(CAMPAIGNS).doc();
  const campaign: Campaign = {
    ...data,
    id: ref.id,
    status: "draft",
    totalRecipients: 0,
    sentCount: 0,
    failedCount: 0,
    deliveredCount: 0,
    readCount: 0,
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    lastError: null,
  };
  await ref.set(campaign);
  return campaign;
}

export async function listCampaigns(db: Firestore, userId: string): Promise<Campaign[]> {
  const snap = await db.collection(CAMPAIGNS).where("userId", "==", userId).get();
  const rows = snap.docs.map((doc) => normalizeCampaign(doc.data()));
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return rows;
}

export async function listRunnableCampaigns(db: Firestore, limit = 20): Promise<Campaign[]> {
  const snap = await db
    .collection(CAMPAIGNS)
    .where("status", "in", ["queued", "sending"])
    .limit(Math.max(1, Math.min(limit, 50)))
    .get();
  return snap.docs.map((doc) => normalizeCampaign(doc.data()));
}

export async function getCampaign(
  db: Firestore,
  campaignId: string
): Promise<Campaign | null> {
  const snap = await db.collection(CAMPAIGNS).doc(campaignId).get();
  return snap.exists ? normalizeCampaign(snap.data()) : null;
}

export async function updateCampaign(
  db: Firestore,
  campaignId: string,
  updates: Partial<Omit<Campaign, "id" | "userId">>
): Promise<Campaign | null> {
  const ref = db.collection(CAMPAIGNS).doc(campaignId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.update(updates);
  const after = await ref.get();
  return normalizeCampaign(after.data());
}

export async function seedCampaignRecipients(
  db: Firestore,
  campaign: Campaign,
  contacts: Array<{ id: string; phone: string; name: string | null }>
): Promise<number> {
  const existing = await db
    .collection(RECIPIENTS)
    .where("campaignId", "==", campaign.id)
    .limit(1)
    .get();
  if (!existing.empty) return campaign.totalRecipients;

  let written = 0;
  let batch = db.batch();
  let batchCount = 0;
  const now = new Date().toISOString();

  for (const contact of contacts) {
    const ref = db.collection(RECIPIENTS).doc();
    const row: CampaignRecipient = {
      id: ref.id,
      campaignId: campaign.id,
      userId: campaign.userId,
      contactId: contact.id,
      phone: contact.phone,
      contactName: contact.name,
      status: "queued",
      waMessageId: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(ref, row);
    written += 1;
    batchCount += 1;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }
  if (batchCount) await batch.commit();

  await db.collection(CAMPAIGNS).doc(campaign.id).update({
    totalRecipients: written,
    status: written ? "queued" : "completed",
    startedAt: written ? new Date().toISOString() : null,
    completedAt: written ? null : new Date().toISOString(),
  });
  return written;
}

export async function claimQueuedRecipients(
  db: Firestore,
  campaignId: string,
  limit = 25
): Promise<CampaignRecipient[]> {
  const snap = await db
    .collection(RECIPIENTS)
    .where("campaignId", "==", campaignId)
    .where("status", "==", "queued")
    .limit(Math.max(1, Math.min(limit, 50)))
    .get();

  const claimed: CampaignRecipient[] = [];
  for (const doc of snap.docs) {
    const claimedRow = await db.runTransaction(async (tx) => {
      const current = await tx.get(doc.ref);
      if (!current.exists) return null;
      const row = current.data() as CampaignRecipient;
      if (row.status !== "queued") return null;
      const updatedAt = new Date().toISOString();
      tx.update(doc.ref, { status: "processing", updatedAt });
      return { ...row, status: "processing", updatedAt } as CampaignRecipient;
    });
    if (claimedRow) claimed.push(claimedRow);
  }
  return claimed;
}

export async function requeueStaleProcessingRecipients(
  db: Firestore,
  campaignId: string,
  staleAfterMinutes = 10
): Promise<number> {
  const snap = await db
    .collection(RECIPIENTS)
    .where("campaignId", "==", campaignId)
    .where("status", "==", "processing")
    .get();
  const cutoff = Date.now() - staleAfterMinutes * 60_000;
  const stale = snap.docs.filter((doc) => {
    const row = doc.data() as CampaignRecipient;
    return new Date(row.updatedAt || 0).getTime() < cutoff;
  });
  if (!stale.length) return 0;
  let batch = db.batch();
  let count = 0;
  for (const doc of stale) {
    batch.update(doc.ref, {
      status: "queued",
      error: "Previous send attempt did not finish; safely requeued.",
      updatedAt: new Date().toISOString(),
    });
    count += 1;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (count % 400) await batch.commit();
  return count;
}

export async function updateRecipient(
  db: Firestore,
  recipientId: string,
  updates: Partial<Pick<CampaignRecipient, "status" | "waMessageId" | "error">>
): Promise<void> {
  await db.collection(RECIPIENTS).doc(recipientId).update({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function refreshCampaignCounts(
  db: Firestore,
  campaignId: string
): Promise<Campaign | null> {
  const [campaign, sent, failed, queued, processing, delivered, read] = await Promise.all([
    getCampaign(db, campaignId),
    db.collection(RECIPIENTS).where("campaignId", "==", campaignId).where("status", "==", "sent").count().get(),
    db.collection(RECIPIENTS).where("campaignId", "==", campaignId).where("status", "==", "failed").count().get(),
    db.collection(RECIPIENTS).where("campaignId", "==", campaignId).where("status", "==", "queued").count().get(),
    db.collection(RECIPIENTS).where("campaignId", "==", campaignId).where("status", "==", "processing").count().get(),
    db.collection(RECIPIENTS).where("campaignId", "==", campaignId).where("status", "==", "delivered").count().get(),
    db.collection(RECIPIENTS).where("campaignId", "==", campaignId).where("status", "==", "read").count().get(),
  ]);
  if (!campaign) return null;

  const sentCount = sent.data().count + delivered.data().count + read.data().count;
  const failedCount = failed.data().count;
  const remaining = queued.data().count + processing.data().count;
  const status: CampaignStatus = remaining
    ? "sending"
    : failedCount
      ? "completed_with_errors"
      : "completed";

  return updateCampaign(db, campaignId, {
    sentCount,
    failedCount,
    deliveredCount: delivered.data().count + read.data().count,
    readCount: read.data().count,
    status,
    completedAt: remaining ? null : new Date().toISOString(),
  });
}

export async function updateCampaignRecipientByWaMessageId(
  db: Firestore,
  waMessageId: string,
  status: "delivered" | "read" | "failed"
): Promise<string | null> {
  const snap = await db
    .collection(RECIPIENTS)
    .where("waMessageId", "==", waMessageId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const row = snap.docs[0].data() as CampaignRecipient;
  await snap.docs[0].ref.update({ status, updatedAt: new Date().toISOString() });
  return row.campaignId;
}
