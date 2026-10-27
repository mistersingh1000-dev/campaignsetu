// Firestore data layer for chat/inbox. Server-side only (Firebase Admin SDK).
import type { Firestore } from "firebase-admin/firestore";

export type Contact = {
  id: string;
  userId: string;
  phone: string;
  name: string | null;
  profileImage: string | null;
  lastMessageTime: string;
  email?: string | null;
  company?: string | null;
  city?: string | null;
  source?: string | null;
  tags?: string[];
  marketingOptIn?: boolean;
  optInSource?: string | null;
  optInAt?: string | null;
  doNotMessage?: boolean;
  createdAt?: string;
};

export type Message = {
  id: string;
  userId: string;
  conversationId: string;
  sender: "user" | "contact";
  content: string;
  timestamp: string;
  status: "sent" | "delivered" | "read" | "failed";
  waMessageId: string | null;
};

export type Conversation = {
  id: string;
  userId: string;
  phoneNumberId: string;
  wabaId: string | null;
  contactPhone: string;
  contactName: string | null;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  isRead: boolean;
  createdAt: string;
};

const CONVERSATIONS = "conversations";
const MESSAGES = "messages";
const CONTACTS = "contacts";

export function convId(userId: string, contactPhone: string): string {
  return `${userId}_${contactPhone}`.replace(/\//g, "_");
}

export async function createConversation(
  db: Firestore,
  userId: string,
  phoneNumberId: string,
  wabaId: string | null,
  contactPhone: string,
  contactName: string | null
): Promise<Conversation> {
  const id = convId(userId, contactPhone);
  const now = new Date().toISOString();
  const conv: Conversation = {
    id,
    userId,
    phoneNumberId,
    wabaId,
    contactPhone,
    contactName,
    lastMessage: null,
    lastMessageTime: now,
    unreadCount: 0,
    isRead: true,
    createdAt: now,
  };
  await db.collection(CONVERSATIONS).doc(id).set(conv);
  return conv;
}

export async function getConversation(
  db: Firestore,
  conversationId: string
): Promise<Conversation | null> {
  const snap = await db.collection(CONVERSATIONS).doc(conversationId).get();
  return snap.exists ? (snap.data() as Conversation) : null;
}

export async function listConversations(db: Firestore, userId: string): Promise<Conversation[]> {
  const snap = await db.collection(CONVERSATIONS).where("userId", "==", userId).get();
  const rows = snap.docs.map((d) => d.data() as Conversation);
  rows.sort((a, b) => (b.lastMessageTime || "").localeCompare(a.lastMessageTime || ""));
  return rows;
}

export async function addMessage(
  db: Firestore,
  userId: string,
  conversationId: string,
  sender: "user" | "contact",
  content: string,
  waMessageId: string | null = null
): Promise<Message> {
  const now = new Date().toISOString();
  const ref = db.collection(MESSAGES).doc();
  const msg: Message = {
    id: ref.id,
    userId,
    conversationId,
    sender,
    content,
    timestamp: now,
    status: "sent",
    waMessageId,
  };
  await ref.set(msg);

  const convRef = db.collection(CONVERSATIONS).doc(conversationId);
  const convSnap = await convRef.get();
  const prevUnread = (convSnap.data()?.unreadCount as number) || 0;

  await convRef.update({
    lastMessage: content.substring(0, 100),
    lastMessageTime: now,
    isRead: sender === "user",
    unreadCount: sender === "contact" ? prevUnread + 1 : 0,
  });

  return msg;
}

export async function getMessages(
  db: Firestore,
  conversationId: string,
  limitTo: number = 50
): Promise<Message[]> {
  const snap = await db
    .collection(MESSAGES)
    .where("conversationId", "==", conversationId)
    .get();
  const rows = snap.docs.map((d) => d.data() as Message);
  rows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return rows.slice(-limitTo);
}

export async function updateMessageStatus(
  db: Firestore,
  waMessageId: string,
  status: "sent" | "delivered" | "read" | "failed"
): Promise<void> {
  const snap = await db
    .collection(MESSAGES)
    .where("waMessageId", "==", waMessageId)
    .limit(1)
    .get();
  if (!snap.empty) await snap.docs[0].ref.update({ status });
}

export async function markConversationRead(
  db: Firestore,
  conversationId: string
): Promise<void> {
  await db.collection(CONVERSATIONS).doc(conversationId).update({
    isRead: true,
    unreadCount: 0,
  });
}

export async function createContact(
  db: Firestore,
  userId: string,
  phone: string,
  name: string | null = null,
  extras: Partial<Omit<Contact, "id" | "userId" | "phone" | "name">> = {}
): Promise<Contact> {
  const id = `${userId}_${phone}`.replace(/\//g, "_");
  const ref = db.collection(CONTACTS).doc(id);
  const before = await ref.get();
  const previous = before.exists ? (before.data() as Contact) : null;
  const now = new Date().toISOString();

  const contact: Contact = {
    id,
    userId,
    phone,
    name: name ?? previous?.name ?? null,
    profileImage: previous?.profileImage ?? null,
    lastMessageTime: extras.lastMessageTime || previous?.lastMessageTime || now,
    email: extras.email ?? previous?.email ?? null,
    company: extras.company ?? previous?.company ?? null,
    city: extras.city ?? previous?.city ?? null,
    source: extras.source ?? previous?.source ?? "manual",
    tags: extras.tags ?? previous?.tags ?? [],
    marketingOptIn: extras.marketingOptIn ?? previous?.marketingOptIn ?? false,
    optInSource: extras.optInSource ?? previous?.optInSource ?? null,
    optInAt: extras.optInAt ?? previous?.optInAt ?? null,
    doNotMessage: extras.doNotMessage ?? previous?.doNotMessage ?? false,
    createdAt: previous?.createdAt || now,
  };
  await ref.set(contact, { merge: true });
  return contact;
}

export async function getContact(db: Firestore, contactId: string): Promise<Contact | null> {
  const snap = await db.collection(CONTACTS).doc(contactId).get();
  return snap.exists ? (snap.data() as Contact) : null;
}

export async function updateContactForUser(
  db: Firestore,
  userId: string,
  contactId: string,
  updates: Partial<Omit<Contact, "id" | "userId" | "phone" | "createdAt">>
): Promise<Contact | null> {
  const ref = db.collection(CONTACTS).doc(contactId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const current = snap.data() as Contact;
  if (current.userId !== userId) return null;
  await ref.update(updates);
  const after = await ref.get();
  return after.data() as Contact;
}

// Legacy internal helper. Prefer updateContactForUser from API routes.
export async function updateContact(
  db: Firestore,
  contactId: string,
  updates: Partial<Omit<Contact, "id">>
): Promise<Contact | null> {
  const ref = db.collection(CONTACTS).doc(contactId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.update(updates);
  const after = await ref.get();
  return after.data() as Contact;
}

export async function deleteContact(db: Firestore, contactId: string): Promise<void> {
  await db.collection(CONTACTS).doc(contactId).delete();
}

export async function listContacts(db: Firestore, userId: string): Promise<Contact[]> {
  const snap = await db.collection(CONTACTS).where("userId", "==", userId).get();
  const rows = snap.docs.map((d) => d.data() as Contact);
  rows.sort((a, b) => (b.lastMessageTime || "").localeCompare(a.lastMessageTime || ""));
  return rows;
}

export async function listMarketingOptedInContacts(
  db: Firestore,
  userId: string
): Promise<Contact[]> {
  const contacts = await listContacts(db, userId);
  return contacts.filter((c) => c.marketingOptIn === true && c.doNotMessage !== true);
}

export async function getStats(
  db: Firestore,
  userId: string
): Promise<{
  totalMessages: number;
  totalContacts: number;
  totalConversations: number;
  unreadConversations: number;
}> {
  const [contacts, conversations, messages] = await Promise.all([
    db.collection(CONTACTS).where("userId", "==", userId).count().get(),
    db.collection(CONVERSATIONS).where("userId", "==", userId).count().get(),
    db.collection(MESSAGES).where("userId", "==", userId).count().get(),
  ]);

  const unread = await db
    .collection(CONVERSATIONS)
    .where("userId", "==", userId)
    .where("isRead", "==", false)
    .count()
    .get();

  return {
    totalContacts: contacts.data().count || 0,
    totalConversations: conversations.data().count || 0,
    totalMessages: messages.data().count || 0,
    unreadConversations: unread.data().count || 0,
  };
}

export async function listAllConversations(db: Firestore): Promise<Conversation[]> {
  const snap = await db.collection(CONVERSATIONS).get();
  const rows = snap.docs.map((d) => d.data() as Conversation);
  rows.sort((a, b) => (b.lastMessageTime || "").localeCompare(a.lastMessageTime || ""));
  return rows;
}
