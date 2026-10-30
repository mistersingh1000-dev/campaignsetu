import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { encryptCredential, decryptCredential } from "./credential-crypto";
export const FACEBOOK_STATE_COOKIE = "campaignsetu_fb_lead_state";
export const REQUIRED_LEAD_PERMISSIONS = ["pages_show_list", "pages_read_engagement", "pages_manage_metadata", "leads_retrieval"];
const ttl = 15 * 60 * 1000;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export type CandidatePage = { id: string; name: string; encryptedToken: string };
export function oauthConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_META_APP_ID && process.env.META_APP_SECRET && process.env.FACEBOOK_LEAD_LOGIN_CONFIG_ID && process.env.NEXT_PUBLIC_SITE_URL);
}
export function callbackUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) throw Error("site_url_missing");
  const url = new URL("/api/crm/facebook/callback", configured);
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") throw Error("https_required");
  return url.toString();
}
export async function beginFacebookLeadLogin(db: Firestore, userId: string) {
  if (!oauthConfigured()) throw Error("facebook_login_not_configured");
  const state = randomBytes(32).toString("hex");
  await db.collection("crm_facebook_oauth_states").doc(hash(state)).create({ userId, expiresAt: new Date(Date.now() + ttl), expiresAtMs: Date.now() + ttl });
  const version = process.env.WHATSAPP_API_VERSION || "v26.0";
  const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
  url.search = new URLSearchParams({ client_id: process.env.NEXT_PUBLIC_META_APP_ID!, redirect_uri: callbackUrl(), config_id: process.env.FACEBOOK_LEAD_LOGIN_CONFIG_ID!, response_type: "code", state }).toString();
  return { state, url: url.toString() };
}
export async function consumeFacebookLeadState(db: Firestore, userId: string, state: string, cookie: string) {
  if (!/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(cookie) || !timingSafeEqual(Buffer.from(state), Buffer.from(cookie))) return false;
  const ref = db.collection("crm_facebook_oauth_states").doc(hash(state));
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data()?.userId !== userId || (!Number.isFinite(snap.data()?.expiresAtMs) || snap.data()!.expiresAtMs <= Date.now())) return false;
    tx.delete(ref);
    return true;
  });
}
function pendingRef(db: Firestore, userId: string) { return db.collection("crm_facebook_onboarding").doc(hash(userId)); }
export async function discoverFacebookPages(code: string, request: typeof fetch = fetch): Promise<CandidatePage[]> {
  const version = process.env.WHATSAPP_API_VERSION || "v26.0";
  const base = `https://graph.facebook.com/${version}`;
  const exchange = await request(`${base}/oauth/access_token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: process.env.NEXT_PUBLIC_META_APP_ID!, client_secret: process.env.META_APP_SECRET!, redirect_uri: callbackUrl(), code }).toString(), cache: "no-store" });
  const tokenData = await exchange.json();
  if (!exchange.ok || typeof tokenData.access_token !== "string") throw Error("token_exchange_failed");
  const headers = { Authorization: `Bearer ${tokenData.access_token}` };
  const permissions = await request(`${base}/me/permissions`, { headers, cache: "no-store" });
  const permissionData = await permissions.json();
  const granted = new Set((permissionData.data || []).filter((p: any) => p.status === "granted").map((p: any) => p.permission));
  if (!permissions.ok || REQUIRED_LEAD_PERMISSIONS.some(p => !granted.has(p))) throw Error("permissions_missing");
  const pages = new Map<string, CandidatePage>();
  let after: string | null = null;
  const cursors = new Set<string>();
  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({ fields: "id,name,access_token", limit: "100" });
    if (after) params.set("after", after);
    const response = await request(`${base}/me/accounts?${params}`, { headers, cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.data)) throw Error("page_discovery_failed");
    for (const item of data.data) {
      if (typeof item.id === "string" && /^\d+$/.test(item.id) && typeof item.access_token === "string" && item.access_token) pages.set(item.id, { id: item.id, name: String(item.name || "Facebook Page").slice(0, 200), encryptedToken: encryptCredential(item.access_token) });
    }
    if (!data.paging?.next) return [...pages.values()];
    after = typeof data.paging?.cursors?.after === "string" ? data.paging.cursors.after : null;
    if (!after || cursors.has(after)) throw Error("page_discovery_incomplete");
    cursors.add(after);
  }
  throw Error("page_discovery_limit");
}
export async function stageFacebookPages(db: Firestore, userId: string, pages: CandidatePage[]) {
  if (!pages.length) throw Error("no_pages_available");
  await pendingRef(db, userId).set({ userId, pages, expiresAt: new Date(Date.now() + ttl), expiresAtMs: Date.now() + ttl });
}
export async function pendingFacebookPages(db: Firestore, userId: string): Promise<CandidatePage[]> {
  const snap = await pendingRef(db, userId).get();
  const data = snap.data();
  return snap.exists && data?.userId === userId && data.expiresAtMs > Date.now() && Array.isArray(data.pages) ? data.pages : [];
}
export async function selectedFacebookPage(db: Firestore, userId: string, pageId: string) {
  const pages = await pendingFacebookPages(db, userId);
  const candidate = pages.find(p => p.id === pageId);
  if (candidate) return candidate;
  // Allow the same owner to retry a failed subscription without asking for a token.
  const existing = await db.collection("crm_facebook_pages").doc(pageId).get();
  const data = existing.data();
  return existing.exists && data?.userId === userId && data?.token ? { id: pageId, name: data.name, encryptedToken: data.token } as CandidatePage : null;
}
export async function connectFacebookPage(db: Firestore, userId: string, page: CandidatePage, request: typeof fetch = fetch) {
  const token = decryptCredential(page.encryptedToken);
  if (!token) throw Error("page_authorization_expired");
  const ref = db.collection("crm_facebook_pages").doc(page.id);
  const allowed = await db.runTransaction(async tx => {
    const current = await tx.get(ref);
    if (current.exists && current.data()?.userId !== userId) return false;
    tx.set(ref, { userId, name: page.name, token: page.encryptedToken, status: "pending", updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  });
  if (!allowed) throw Error("page_workspace_conflict");
  const version = process.env.WHATSAPP_API_VERSION || "v26.0";
  try {
    const response = await request(`https://graph.facebook.com/${version}/${page.id}/subscribed_apps`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ subscribed_fields: ["leadgen"] }), cache: "no-store" });
    const result = await response.json();
    if (!response.ok || result.success !== true) throw Error("subscription_failed");
    await ref.update({ status: "subscribed", updatedAt: new Date().toISOString() });
    return { id: page.id, name: page.name, status: "subscribed" };
  } catch {
    await ref.update({ status: "subscription_failed" });
    throw Error("subscription_failed");
  }
}
