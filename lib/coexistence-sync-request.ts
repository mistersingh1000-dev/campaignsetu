import { createHash } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { decryptCredential } from "./credential-crypto";

// Mark a request before contacting Meta. An uncertain network result must not be
// automatically repeated: these imports can only be initiated once after onboarding.
export async function requestCoexistenceSync(db: Firestore, email: string, fetcher: typeof fetch = fetch) {
  const userRef = db.collection("users").doc(email);
  const user = (await userRef.get()).data();
  if (!user?.wa_coexistence || !user.wa_registered || !/^\d+$/.test(user.phone_number_id || "")) throw new Error("coexistence_not_connected");
  if (!user.wa_connected_at || !Number.isFinite(Date.parse(user.wa_connected_at)) || Date.now() - Date.parse(user.wa_connected_at) > 24*60*60*1000) throw new Error("sync_window_expired");
  const token = decryptCredential(user.wa_token);
  if (!token) throw new Error("connection_credential_missing");
  const ref = db.collection("wa_coexistence_sync").doc(createHash("sha256").update(email).digest("hex"));
  for (const kind of ["smb_app_state_sync", "history"] as const) {
    const claimed = await db.runTransaction(async tx => {
      const snap = await tx.get(ref), item = snap.data()?.[kind];
      if (item && item.status !== "rejected") return false;
      tx.set(ref, { userId:email, phoneId:user.phone_number_id, [kind]:{status:"requesting",at:new Date().toISOString()} },{merge:true});
      return true;
    });
    if (!claimed) {
      if (kind === "smb_app_state_sync" && (await ref.get()).data()?.[kind]?.status !== "requested") break;
      continue;
    }
    try {
      const response = await fetcher(`https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || "v26.0"}/${user.phone_number_id}/smb_app_data`, {
        method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({ messaging_product:"whatsapp", sync_type:kind }),cache:"no-store", signal:AbortSignal.timeout(20000),
      });
      const data = await response.json().catch(()=>({}));
      const requestId = typeof data.request_id === "string" ? data.request_id : null;
      // Only an explicit Graph rejection is safe to retry; 5xx/invalid responses are uncertain.
      const status = response.ok && requestId ? "requested" : response.status >= 400 && response.status < 500 && data.error ? "rejected" : "uncertain";
      await ref.set({ [kind]:{status,requestId,at:new Date().toISOString(),errorCode:Number(data?.error?.code)||null} },{merge:true});
      if (status !== "requested") break;
    } catch {
      await ref.set({ [kind]:{status:"uncertain",at:new Date().toISOString()} },{merge:true});
      break;
    }
  }
  const state = (await ref.get()).data() || {};
  return { contacts:state.smb_app_state_sync?.status || "not_requested", history:state.history?.status || "not_requested" };
}
