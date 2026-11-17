import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { encryptCredential, decryptCredential } from "@/lib/credential-crypto";

export const FB_PUBLISH_STATE_COOKIE = "las_fb_publish_state";
const ttl = 10 * 60 * 1000;
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
const version = () => process.env.META_GRAPH_API_VERSION || process.env.WHATSAPP_API_VERSION || "v26.0";
export function facebookPublishConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim() && process.env.NEXT_PUBLIC_SITE_URL?.trim());
}
export function facebookPublishCallback() {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) throw new Error("site_url_missing");
  const u = new URL("/api/crm/facebook-publishing/callback", base);
  if (process.env.NODE_ENV === "production" && u.protocol !== "https:") throw new Error("https_required");
  return u.toString();
}
export async function startFacebookPublishLogin(db: Firestore, userId: string) {
  if (!facebookPublishConfigured()) throw new Error("meta_config_missing");
  const state = randomBytes(32).toString("hex");
  await db.collection("crm_facebook_publish_states").doc(hash(state)).create({ userId, expiresAt: Date.now() + ttl });
  const u = new URL(`https://www.facebook.com/${version()}/dialog/oauth`);
  u.search = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_META_APP_ID!.trim(),
    redirect_uri: facebookPublishCallback(),
    response_type: "code",
    state,
    scope: "pages_show_list,pages_read_engagement,pages_manage_posts",
  }).toString();
  return { state, url: u.toString() };
}
export async function consumeFacebookPublishState(db: Firestore, userId: string, state: string, cookie: string) {
  if (!/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(cookie) || !timingSafeEqual(Buffer.from(state), Buffer.from(cookie))) return false;
  const ref = db.collection("crm_facebook_publish_states").doc(hash(state));
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data()?.userId !== userId || Number(snap.data()?.expiresAt || 0) < Date.now()) return false;
    tx.delete(ref); return true;
  });
}
export async function exchangeAndSavePages(db: Firestore, userId: string, code: string) {
  const base = `https://graph.facebook.com/${version()}`;
  const tokenRes = await fetch(`${base}/oauth/access_token`, { method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"}, body:new URLSearchParams({client_id:process.env.NEXT_PUBLIC_META_APP_ID!,client_secret:process.env.META_APP_SECRET!,redirect_uri:facebookPublishCallback(),code}), cache:"no-store" });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || typeof tokenData.access_token !== "string") throw new Error("token_exchange_failed");
  const meRes = await fetch(`${base}/me/accounts?fields=id,name,access_token&limit=100`, { headers:{Authorization:`Bearer ${tokenData.access_token}`}, cache:"no-store" });
  const meData = await meRes.json();
  if (!meRes.ok || !Array.isArray(meData.data)) throw new Error("page_discovery_failed");
  const pages = [];
  for (const p of meData.data) {
    if (!/^\d{1,40}$/.test(String(p.id)) || typeof p.access_token !== "string") continue;
    const ref = db.collection("crm_facebook_publish_pages").doc(hash(userId + ":" + p.id));
    await ref.set({ userId, pageId:String(p.id), name:String(p.name || "Facebook Page").slice(0,200), pageToken:encryptCredential(p.access_token), updatedAt:new Date().toISOString() }, {merge:true});
    pages.push({id:String(p.id),name:String(p.name || "Facebook Page")});
  }
  return pages;
}
export async function listFacebookPublishPages(db: Firestore, userId: string) {
  const snap = await db.collection("crm_facebook_publish_pages").where("userId","==",userId).get();
  return snap.docs.map(d=>({id:d.data().pageId as string,name:d.data().name as string}));
}
export async function publishFacebookPost(db: Firestore, userId: string, pageId: string, message: string, imageUrl?: string) {
  const snap = await db.collection("crm_facebook_publish_pages").where("userId","==",userId).where("pageId","==",pageId).limit(1).get();
  if (snap.empty) throw new Error("page_not_connected");
  const token = decryptCredential(snap.docs[0].data().pageToken);
  if (!token) throw new Error("page_token_missing");
  const base = `https://graph.facebook.com/${version()}/${encodeURIComponent(pageId)}`;
  const endpoint = imageUrl ? `${base}/photos` : `${base}/feed`;
  const body = new URLSearchParams(imageUrl ? {url:imageUrl,message,access_token:token} : {message,access_token:token});
  const res = await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body,cache:"no-store"});
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || "facebook_publish_failed");
  return {id:String(data.id || data.post_id || ""),postId:String(data.post_id || data.id || "")};
}
