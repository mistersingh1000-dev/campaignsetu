import type { Firestore } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
export const stages = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"] as const;
export type Stage = typeof stages[number];
export type Lead = { id: string; userId: string; name: string; phone: string; email: string; source: string; stage: Stage; notes: string; followUpAt: string | null; value: number; createdAt: string; updatedAt: string; facebookLeadId?: string; };
export function cleanLead(input: any, requireContact = true) {
  const name = String(input.name || "").trim().slice(0,120);
  const phone = String(input.phone || "").replace(/[^+0-9]/g,"").slice(0,20);
  const email = String(input.email || "").trim().toLowerCase().slice(0,254);
  if (!name || (requireContact && !phone && !email)) throw new Error("Name and a phone number or email are required.");
  if (phone && !/^\\+?[0-9]{7,15}$/.test(phone)) throw new Error("Invalid phone number.");
  if (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) throw new Error("Invalid email address.");
  if (input.stage && !stages.includes(input.stage)) throw new Error("Invalid stage.");
  const stage: Stage = stages.includes(input.stage) ? input.stage : "New";
  const due = input.followUpAt ? new Date(input.followUpAt) : null;
  if (due && !Number.isFinite(due.getTime())) throw new Error("Invalid follow-up date.");
  const value = Number(input.value || 0);
  if (!Number.isFinite(value) || value < 0 || value > 1e12) throw new Error("Invalid deal value.");
  return { name, phone, email, stage, notes: String(input.notes || "").slice(0,10000), followUpAt: due?.toISOString() || null, value };
}
export async function saveLead(db: Firestore, userId: string, input: any, facebookLeadId?: string) {
  const fields = cleanLead(input, !facebookLeadId);
  const ref = facebookLeadId ? db.collection("crm_leads").doc(createHash("sha256").update(userId + ":" + facebookLeadId).digest("hex")) : db.collection("crm_leads").doc();
  return db.runTransaction(async tx => {
    const previous = await tx.get(ref);
    if (previous.exists) return previous.data() as Lead;
    const now = new Date().toISOString();
    const lead: Lead = { ...fields, id: ref.id, userId, source: facebookLeadId ? "Facebook Lead Ads" : "Manual", createdAt: now, updatedAt: now, ...(facebookLeadId ? {facebookLeadId} : {}) };
    tx.create(ref, lead);
    return lead;
  });
}
