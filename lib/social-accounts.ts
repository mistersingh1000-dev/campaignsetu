import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { decryptCredential, encryptCredential } from "./credential-crypto";

export type SocialPlatform = "facebook" | "instagram" | "twitter" | "whatsapp";
export const SOCIAL_META_STATE_COOKIE = "campaignsetu_social_meta_state";
export const SOCIAL_TWITTER_STATE_COOKIE = "campaignsetu_social_x_state";
const STATE_TTL_MS = 15 * 60 * 1000;
const hash = (v: string) => createHash("sha256").update(v).digest("hex");

export type StoredSocialAccount = {
  id: string;
  userId: string;
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  username?: string;
  encryptedToken: string;
  encryptedRefreshToken?: string;
  metaPageId?: string;
  status: "connected" | "error";
  updatedAt: string;
};

export function socialConfigStatus() {
  const site = Boolean(process.env.NEXT_PUBLIC_SITE_URL);
  const meta = Boolean(site && process.env.NEXT_PUBLIC_META_APP_ID && process.env.META_APP_SECRET);
  const twitter = Boolean(site && process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET);
  const whatsapp = Boolean(process.env.NEXT_PUBLIC_META_APP_ID && process.env.NEXT_PUBLIC_META_CONFIG_ID);
  return { facebook: meta, instagram: meta, twitter, whatsapp };
}

function callbackUrl(path: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) throw Error("site_url_missing");
  return new URL(path, configured).toString();
}

export async function beginMetaSocialAuth(db: Firestore, userId: string) {
  if (!process.env.NEXT_PUBLIC_META_APP_ID || !process.env.META_APP_SECRET || !process.env.NEXT_PUBLIC_SITE_URL) {
    throw Error("meta_social_not_configured");
  }
  const state = randomBytes(32).toString("hex");
  await db.collection("social_oauth_states").doc(hash(state)).create({
    userId,
    provider: "meta",
    expiresAtMs: Date.now() + STATE_TTL_MS,
  });
  const version = process.env.WHATSAPP_API_VERSION || "v26.0";
  const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
  const params: Record<string, string> = {
  client_id: process.env.NEXT_PUBLIC_META_APP_ID,
  redirect_uri: callbackUrl("/api/social/meta/callback"),
  response_type: "code",
  state,
};
  if (process.env.META_SOCIAL_CONFIG_ID) {
    params.config_id = process.env.META_SOCIAL_CONFIG_ID;
  } else {
    params.scope = process.env.META_SOCIAL_SCOPES || "pages_show_list,pages_read_engagement";
  }
  url.search = new URLSearchParams(params).toString();
  return { state, url: url.toString() };
}

async function consumeState(db: Firestore, userId: string, state: string, cookie: string, provider: string) {
  if (!/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(cookie)) return null;
  if (!timingSafeEqual(Buffer.from(state), Buffer.from(cookie))) return null;
  const ref = db.collection("social_oauth_states").doc(hash(state));
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!snap.exists || data?.userId !== userId || data?.provider !== provider || !Number.isFinite(data?.expiresAtMs) || data!.expiresAtMs <= Date.now()) {
      return null;
    }
    tx.delete(ref);
    return data;
  });
}

export async function completeMetaSocialAuth(db: Firestore, userId: string, code: string, state: string, cookie: string) {
  const valid = await consumeState(db, userId, state, cookie, "meta");
  if (!valid) throw Error("invalid_oauth_state");
  const version = process.env.WHATSAPP_API_VERSION || "v26.0";
  const base = `https://graph.facebook.com/${version}`;
  const exchange = await fetch(`${base}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      redirect_uri: callbackUrl("/api/social/meta/callback"),
      code,
    }).toString(),
    cache: "no-store",
  });
  const tokenData = await exchange.json();
  if (!exchange.ok || typeof tokenData.access_token !== "string") throw Error("meta_token_exchange_failed");

  const pagesRes = await fetch(
    `${base}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&limit=50`,
    { headers: { Authorization: `Bearer ${tokenData.access_token}` }, cache: "no-store" }
  );
  const pagesData = await pagesRes.json();
  if (!pagesRes.ok || !Array.isArray(pagesData.data)) throw Error("meta_pages_fetch_failed");

  const now = new Date().toISOString();
  const connected: string[] = [];
  for (const page of pagesData.data) {
    if (typeof page.id !== "string" || typeof page.access_token !== "string") continue;
    const encPageToken = encryptCredential(page.access_token);
    const fbDocId = `${hash(userId)}_facebook_${page.id}`;
    await db.collection("social_accounts").doc(fbDocId).set({
      userId,
      platform: "facebook",
      accountId: page.id,
      accountName: String(page.name || "Facebook Page").slice(0, 120),
      encryptedToken: encPageToken,
      status: "connected",
      updatedAt: now,
    }, { merge: true });
    connected.push(`facebook:${page.id}`);

    const ig = page.instagram_business_account;
    if (ig && typeof ig.id === "string") {
      const igDocId = `${hash(userId)}_instagram_${ig.id}`;
      await db.collection("social_accounts").doc(igDocId).set({
        userId,
        platform: "instagram",
        accountId: ig.id,
        accountName: String(ig.name || ig.username || "Instagram Business").slice(0, 120),
        username: ig.username ? String(ig.username) : undefined,
        encryptedToken: encPageToken,
        metaPageId: page.id,
        status: "connected",
        updatedAt: now,
      }, { merge: true });
      connected.push(`instagram:${ig.id}`);
    }
  }
  return connected;
}

export async function beginTwitterAuth(db: Firestore, userId: string) {
  if (!process.env.X_CLIENT_ID || !process.env.X_CLIENT_SECRET || !process.env.NEXT_PUBLIC_SITE_URL) {
    throw Error("twitter_not_configured");
  }
  const state = randomBytes(32).toString("hex");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  await db.collection("social_oauth_states").doc(hash(state)).create({
    userId,
    provider: "twitter",
    codeVerifier,
    expiresAtMs: Date.now() + STATE_TTL_MS,
  });
  const url = new URL("https://twitter.com/i/oauth2/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: process.env.X_CLIENT_ID,
    redirect_uri: callbackUrl("/api/social/twitter/callback"),
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  return { state, url: url.toString() };
}

export async function completeTwitterAuth(db: Firestore, userId: string, code: string, state: string, cookie: string) {
  const stateDoc = await consumeState(db, userId, state, cookie, "twitter");
  if (!stateDoc || typeof stateDoc.codeVerifier !== "string") throw Error("invalid_oauth_state");
  const basic = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString("base64");
  const exchange = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl("/api/social/twitter/callback"),
      code_verifier: stateDoc.codeVerifier,
    }).toString(),
    cache: "no-store",
  });
  const tokenData = await exchange.json();
  if (!exchange.ok || typeof tokenData.access_token !== "string") throw Error("twitter_token_exchange_failed");

  const meRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
    cache: "no-store",
  });
  const meData = await meRes.json();
  const user = meData?.data;
  if (!meRes.ok || !user?.id) throw Error("twitter_user_fetch_failed");

  const docId = `${hash(userId)}_twitter_${user.id}`;
  await db.collection("social_accounts").doc(docId).set({
    userId,
    platform: "twitter",
    accountId: String(user.id),
    accountName: String(user.name || user.username || "X Account").slice(0, 120),
    username: user.username ? String(user.username) : undefined,
    encryptedToken: encryptCredential(tokenData.access_token),
    encryptedRefreshToken: tokenData.refresh_token ? encryptCredential(tokenData.refresh_token) : undefined,
    status: "connected",
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return { id: docId, username: user.username };
}

export async function publishToFacebook(account: StoredSocialAccount, payload: { text: string; mediaUrl?: string; mediaType?: string }) {
  const token = decryptCredential(account.encryptedToken);
  if (!token) throw Error("missing_facebook_token");
  const version = process.env.WHATSAPP_API_VERSION || "v26.0";
  const base = `https://graph.facebook.com/${version}/${account.accountId}`;
  let endpoint = `${base}/feed`;
  const body: Record<string, string> = { message: payload.text };
  if (payload.mediaUrl && payload.mediaType === "image") {
    endpoint = `${base}/photos`;
    body.url = payload.mediaUrl;
    body.caption = payload.text;
  } else if (payload.mediaUrl && payload.mediaType === "video") {
    endpoint = `${base}/videos`;
    body.file_url = payload.mediaUrl;
    body.description = payload.text;
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw Error(data?.error?.message || "facebook_publish_failed");
  return data;
}

export async function publishToInstagram(account: StoredSocialAccount, payload: { text: string; mediaUrl?: string; mediaType?: string }) {
  if (!payload.mediaUrl) throw Error("Instagram requires an image or video URL.");
  const token = decryptCredential(account.encryptedToken);
  if (!token) throw Error("missing_instagram_token");
  const version = process.env.WHATSAPP_API_VERSION || "v26.0";
  const base = `https://graph.facebook.com/${version}/${account.accountId}`;
  const containerBody = payload.mediaType === "video"
    ? { media_type: "REELS", video_url: payload.mediaUrl, caption: payload.text }
    : { image_url: payload.mediaUrl, caption: payload.text };
  const createRes = await fetch(`${base}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(containerBody),
    cache: "no-store",
  });
  const createData = await createRes.json();
  if (!createRes.ok || !createData.id) throw Error(createData?.error?.message || "instagram_container_failed");
  const pubRes = await fetch(`${base}/media_publish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: createData.id }),
    cache: "no-store",
  });
  const pubData = await pubRes.json();
  if (!pubRes.ok) throw Error(pubData?.error?.message || "instagram_publish_failed");
  return pubData;
}

export async function publishToTwitter(account: StoredSocialAccount, payload: { text: string }) {
  const token = decryptCredential(account.encryptedToken);
  if (!token) throw Error("missing_twitter_token");
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: payload.text.slice(0, 280) }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw Error(data?.detail || data?.title || "twitter_publish_failed");
  return data;
}
