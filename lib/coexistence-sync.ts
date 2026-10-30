import { createHash } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { convId } from "./chat-db";

const phone = (v: unknown) => typeof v === "string" && /^\+?\d{5,20}$/.test(v) ? v.replace(/^\+/, "") : null;
function iso(v: unknown): string | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n < 8640000000000 ? new Date(n * 1000).toISOString() : null;
}
function content(m: any): string {
  return String(m?.[m?.type]?.body || m?.[m?.type]?.caption || `[${m?.type || "unsupported"} message]`).slice(0, 100000);
}
export async function importCoexistenceMessage(db: Firestore, owner: any, phoneId: string, peer: string, m: any, sender: "user" | "contact", history: boolean) {
  const contactPhone = phone(peer), timestamp = iso(m?.timestamp);
  if (!contactPhone || typeof m?.id !== "string" || !m.id || !timestamp) return;
  const userId = owner.email, conversationId = convId(userId, contactPhone);
  const id = "sync_" + createHash("sha256").update(userId + "\0" + m.id).digest("hex");
  const ref = db.collection("messages").doc(id), conv = db.collection("conversations").doc(conversationId);
  // Existing API/inbound messages use older IDs. Do not duplicate them during import.
  const old = await db.collection("messages").where("waMessageId", "==", m.id).get();
  if (old.docs.some(d => d.data().userId === userId && d.id !== id)) return;
  await db.runTransaction(async tx => {
    const [prior, conversation] = await Promise.all([tx.get(ref), tx.get(conv)]);
    const previous = prior.data(), current = conversation.data();
    // A delayed media payload may enrich a placeholder; never downgrade real content.
    if (prior.exists && !(previous?.syncType === "media_placeholder" && m.type !== "media_placeholder")) return;
    const text = content(m), status = m?.history_context?.status;
    tx.set(ref, { id, userId, conversationId, sender, content: text, timestamp,
      status: ["read", "delivered", "sent", "failed"].includes(status) ? status : status === "error" ? "failed" : "sent",
      waMessageId: m.id, syncType: String(m.type || "unsupported"), importedHistory: history,
      mediaId: typeof m?.[m.type]?.id === "string" ? m[m.type].id : null });
    if (!conversation.exists) {
      tx.set(conv, { id: conversationId, userId, phoneNumberId: phoneId, wabaId: owner.waba_id || null,
        contactPhone, contactName: null, lastMessage: text.slice(0,100), lastMessageTime: timestamp,
        unreadCount: 0, isRead: true, createdAt: timestamp });
    } else if (!current?.lastMessageTime || timestamp >= current.lastMessageTime) {
      tx.update(conv, { lastMessage: text.slice(0,100), lastMessageTime: timestamp });
    }
  });
}
export async function digestCoexistenceChange(db: Firestore, owner: any, phoneId: string, field: string, value: any): Promise<boolean> {
  if (field === "smb_message_echoes") {
    for (const message of value.message_echoes || []) await importCoexistenceMessage(db, owner, phoneId, message.to, message, "user", false);
    return true;
  }
  if (field === "smb_app_state_sync") {
    for (const item of value.state_sync || []) {
      const p = phone(item?.contact?.phone_number), timestamp = iso(item?.metadata?.timestamp);
      if (item.type !== "contact" || !p || !timestamp || !["add","remove"].includes(item.action)) continue;
      const id = convId(owner.email,p), ref = db.collection("contacts").doc(id);
      await db.runTransaction(async tx => {
        const snap = await tx.get(ref), current = snap.data();
        if (current?.businessAppSyncAt && current.businessAppSyncAt >= timestamp) return;
        const sync = { businessAppSyncAt: timestamp, businessAppRemoved: item.action === "remove" };
        if (snap.exists) {
          // Keep CRM fields, opt-out and consent intact. App removal is a tombstone.
          tx.update(ref, { ...sync, ...(item.action === "add" ? { name: String(item.contact.full_name || item.contact.first_name || current?.name || "").slice(0,200) || null } : {}) });
        } else {
          tx.set(ref, { id, userId: owner.email, phone:p, name: item.action === "add" ? String(item.contact.full_name || item.contact.first_name || "").slice(0,200) || null : null,
            profileImage:null, lastMessageTime:timestamp, source:"whatsapp-business-app", createdAt:timestamp,
            marketingOptIn:false, doNotMessage:false, ...sync });
        }
      });
    }
    return true;
  }
  if (field !== "history") return false;
  for (const chunk of value.history || []) {
    for (const thread of chunk.threads || []) {
      for (const message of thread.messages || []) {
        const p = phone(thread.id);
        if (!p || ![p, phone(value?.metadata?.display_phone_number)].includes(phone(message.from))) continue;
        await importCoexistenceMessage(db, owner, phoneId, p, message, phone(message.from) === p ? "contact" : "user", true);
      }
    }
    const errors = (chunk.errors || []).map((e:any) => Number(e.code)).filter(Number.isFinite);
    const progress = Number(chunk?.metadata?.progress);
    const ref = db.collection("wa_coexistence_sync").doc(createHash("sha256").update(owner.email).digest("hex"));
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref), current = snap.data();
      tx.set(ref, { userId:owner.email, phoneId, historyUpdatedAt:new Date().toISOString(),
        ...(errors.length ? { historyStatus:errors.includes(2593109) ? "declined" : "error", historyErrorCodes:errors } : {}),
        ...(Number.isFinite(progress) ? { historyProgress:Math.max(Number(current?.historyProgress)||0,Math.min(100,Math.max(0,progress))),
          historyStatus: Math.max(Number(current?.historyProgress)||0,progress) >= 100 ? "complete" : "receiving" } : {}) }, { merge:true });
    });
  }
  // Media hydration arrives under field=history, but in value.messages.
  for (const message of value.messages || []) {
    const p = phone(message.to) || phone(message.from);
    if (p) await importCoexistenceMessage(db,owner,phoneId,p,message,message.to ? "user" : "contact",true);
  }
  return true;
}
