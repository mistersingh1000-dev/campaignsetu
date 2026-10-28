import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { getDb, findUser, updateUser } from "@/lib/db";
import { encryptCredential } from "@/lib/credential-crypto";
import {
  provisionProviderAccess,
  providerMessagingToken,
  providerModeEnabled,
} from "@/lib/meta-provider";
import { accessState, paidFeatureError } from "@/lib/entitlements";
import { hasPendingCoexistence, stageCoexistence, claimCoexistence, releaseCoexistence, finishCoexistence } from "@/lib/coexistence-pending";

export const runtime = "nodejs";

function newRegistrationPin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function GET() {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ pending: false }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  return NextResponse.json({ pending: await hasPendingCoexistence(db, session.sub) });
}

export async function POST(req: Request) {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "database_not_configured", message: "Firebase is not configured on the server." },
      { status: 503 }
    );
  }

  const user = await findUser(db, session.sub);
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  const access = accessState(user);
  if (!access.active) {
    const denied = paidFeatureError(access);
    return NextResponse.json({ error: denied.error, message: denied.message }, { status: denied.status });
  }

  const input = await req.json().catch(() => ({}));
  const resume = input.resume === true;
  const coexistence = input.coexistence === true || resume;
  const { code, waba_id, phone_number_id } = input;
  if (!resume && (!code || !waba_id || (!coexistence && !phone_number_id))) {
    return NextResponse.json({ error: "missing_signup_result", message: "Meta signup did not return all required values." }, { status: 400 });
  }
  if (!resume && coexistence && (!/^\\d+$/.test(String(waba_id)) || (phone_number_id && !/^\\d+$/.test(String(phone_number_id))))) {
    return NextResponse.json({ error: "invalid_signup_result" }, { status: 400 });
  }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const version = process.env.WHATSAPP_API_VERSION || "v26.0";
  if (!appId || !appSecret) {
    return NextResponse.json({ error: "meta_not_configured", message: "Meta Embedded Signup is not configured on the server." }, { status: 503 });
  }

  let signupAccessToken = "";
  if (!resume) {
    if (coexistence && await hasPendingCoexistence(db, session.sub)) {
      return NextResponse.json({ error: "coexistence_pending", pending: true, message: "Your previous connection is pending. Resume it instead of starting again." }, { status: 409 });
    }
    try {
      const tokenRes = await fetch(
        `https://graph.facebook.com/${version}/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(String(code))}`,
        { cache: "no-store" }
      );
      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokenData?.access_token) {
        return NextResponse.json({ error: "token_exchange_failed", message: "Meta could not finish authorization. Contact support before retrying." }, { status: 502 });
      }
      signupAccessToken = tokenData.access_token;
    } catch {
      return NextResponse.json({ error: "meta_unreachable", message: "The authorization result is uncertain. Contact support before starting again." }, { status: 502 });
    }
    if (coexistence) {
      try {
        const staged = await stageCoexistence(db, session.sub, String(waba_id), phone_number_id ? String(phone_number_id) : null, signupAccessToken);
        if (!staged) return NextResponse.json({ error: "coexistence_pending", pending: true, message: "A connection is already pending. Resume it instead of starting again." }, { status: 409 });
      } catch {
        return NextResponse.json({ error: "coexistence_save_failed", message: "Meta linked the account, but the server could not save the connection securely. Contact support before retrying." }, { status: 503 });
      }
    }
  }

  if (coexistence) {
    let lease: Awaited<ReturnType<typeof claimCoexistence>> = null;
    try {
      lease = await claimCoexistence(db, session.sub);
      if (!lease) return NextResponse.json({ error: "coexistence_unavailable", pending: await hasPendingCoexistence(db, session.sub), message: "A connection may already be processing. Wait and use Resume connection." }, { status: 409 });
      const url = `https://graph.facebook.com/${version}/${encodeURIComponent(lease.wabaId)}/phone_numbers?fields=id,display_phone_number,verified_name,is_on_biz_app,platform_type&limit=100`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${lease.token}` }, cache: "no-store" });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(result.data) || result.paging?.next) {
        return NextResponse.json({ error: "coexistence_discovery_failed", pending: true, message: "Could not safely identify the linked number. Resume later or contact support." }, { status: 502 });
      }
      const candidates = result.data.filter((p: any) => /^\\d+$/.test(String(p.id || "")) && p.is_on_biz_app === true && p.platform_type === "CLOUD_API" && (!lease!.phoneId || String(p.id) === lease!.phoneId));
      if (candidates.length !== 1) {
        return NextResponse.json({ error: "coexistence_number_ambiguous", pending: true, message: "The linked Business App number could not be uniquely verified. Contact support." }, { status: 409 });
      }
      const phone = candidates[0];
      const subscribe = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(lease.wabaId)}/subscribed_apps`, {
        method: "POST", headers: { Authorization: `Bearer ${lease.token}` }, cache: "no-store",
      });
      const subData = await subscribe.json().catch(() => ({}));
      if (!subscribe.ok || subData?.success !== true) {
        return NextResponse.json({ error: "webhook_subscription_failed", pending: true, message: "Webhook subscription failed. Your pending connection is saved; use Resume connection." }, { status: 502 });
      }
      const outcome = await finishCoexistence(db, session.sub, lease.leaseId, String(phone.id));
      if (outcome !== "ok") return NextResponse.json({ error: "coexistence_" + outcome, pending: true, message: "The phone is already assigned or the request expired. Contact support." }, { status: 409 });
      return NextResponse.json({ ok: true, registered: true, coexistence: true, waba_id: lease.wabaId, phone_number_id: String(phone.id), display_phone_number: phone.display_phone_number || null });
    } catch {
      return NextResponse.json({ error: "coexistence_setup_failed", pending: true, message: "Connection is pending. Use Resume connection or contact support." }, { status: 502 });
    } finally {
      if (lease) await releaseCoexistence(db, session.sub, lease.leaseId).catch(() => {});
    }
  }

  let phoneDetails: any = null;
  try {
    const verifyRes = await fetch(
      `https://graph.facebook.com/${version}/${encodeURIComponent(String(phone_number_id))}?fields=id,display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${signupAccessToken}` }, cache: "no-store" }
    );
    const verifyData = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok || String(verifyData?.id || "") !== String(phone_number_id)) {
      return NextResponse.json(
        { error: "asset_verification_failed", message: verifyData?.error?.message || "Meta could not verify the connected phone number." },
        { status: 502 }
      );
    }
    phoneDetails = verifyData;
  } catch {
    return NextResponse.json(
      { error: "asset_verification_failed", message: "Could not verify the connected WhatsApp number." },
      { status: 502 }
    );
  }

  const provider = await provisionProviderAccess(String(waba_id));
  if (providerModeEnabled() && provider.errors.length) {
    return NextResponse.json(
      {
        error: "provider_provisioning_failed",
        message: provider.errors[0],
        provider: {
          systemUserAssigned: provider.systemUserAssigned,
          creditLineAttached: provider.creditLineAttached,
        },
      },
      { status: 502 }
    );
  }

  const operationalToken = providerModeEnabled()
    ? providerMessagingToken()
    : signupAccessToken;
  if (!operationalToken) {
    return NextResponse.json(
      {
        error: "provider_messaging_token_missing",
        message: "Provider mode is enabled but the Meta system-user messaging token is missing.",
      },
      { status: 503 }
    );
  }

  try {
    const subscribeRes = await fetch(
      `https://graph.facebook.com/${version}/${encodeURIComponent(String(waba_id))}/subscribed_apps`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${operationalToken}` },
        cache: "no-store",
      }
    );
    const subscribeData = await subscribeRes.json().catch(() => ({}));
    if (!subscribeRes.ok) {
      return NextResponse.json(
        { error: "webhook_subscription_failed", message: subscribeData?.error?.message || "Could not enable webhook events for this WhatsApp account." },
        { status: 502 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "webhook_subscription_failed", message: "Could not enable webhook events for this WhatsApp account." },
      { status: 502 }
    );
  }

  const registrationPin = newRegistrationPin();
  const saved = await updateUser(db, session.sub, {
    waba_id: String(waba_id),
    phone_number_id: String(phone_number_id),
    wa_token: encryptCredential(signupAccessToken),
    wa_registered: false,
    wa_registration_pin: encryptCredential(registrationPin),
    wa_registration_error: null,
    wa_connected_at: null,
  });
  if (!saved) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  try {
    const registerRes = await fetch(
      `https://graph.facebook.com/${version}/${encodeURIComponent(String(phone_number_id))}/register`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${operationalToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", pin: registrationPin }),
        cache: "no-store",
      }
    );
    const registerData = await registerRes.json().catch(() => ({}));

    if (registerRes.ok && (registerData?.success === true || registerData?.success === "true")) {
      await updateUser(db, session.sub, {
        wa_registered: true,
        wa_registration_error: null,
        wa_connected_at: new Date().toISOString(),
      });

      return NextResponse.json({
        ok: true,
        registered: true,
        trialAccess: user.plan === "trial",
        accessEndsAt: user.trial_ends_at,
        waba_id: String(waba_id),
        phone_number_id: String(phone_number_id),
        display_phone_number: phoneDetails?.display_phone_number || null,
        verified_name: phoneDetails?.verified_name || null,
        provider: {
          enabled: provider.enabled,
          systemUserAssigned: provider.systemUserAssigned,
          creditLineAttached: provider.creditLineAttached,
        },
      });
    }

    const message =
      registerData?.error?.message ||
      "Meta signup completed, but the final phone registration step is still pending.";
    await updateUser(db, session.sub, {
      wa_registered: false,
      wa_registration_error: String(message).slice(0, 500),
    });

    return NextResponse.json(
      {
        ok: true,
        registered: false,
        needsRegistration: true,
        trialAccess: user.plan === "trial",
        accessEndsAt: user.trial_ends_at,
        message,
        waba_id: String(waba_id),
        phone_number_id: String(phone_number_id),
        display_phone_number: phoneDetails?.display_phone_number || null,
        verified_name: phoneDetails?.verified_name || null,
        provider: {
          enabled: provider.enabled,
          systemUserAssigned: provider.systemUserAssigned,
          creditLineAttached: provider.creditLineAttached,
        },
      },
      { status: 202 }
    );
  } catch {
    const message = "Meta signup completed, but the final phone registration request could not be completed.";
    await updateUser(db, session.sub, {
      wa_registered: false,
      wa_registration_error: message,
    });
    return NextResponse.json(
      {
        ok: true,
        registered: false,
        needsRegistration: true,
        trialAccess: user.plan === "trial",
        accessEndsAt: user.trial_ends_at,
        message,
        waba_id: String(waba_id),
        phone_number_id: String(phone_number_id),
        provider: {
          enabled: provider.enabled,
          systemUserAssigned: provider.systemUserAssigned,
          creditLineAttached: provider.creditLineAttached,
        },
      },
      { status: 202 }
    );
  }
}
