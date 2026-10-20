import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

async function graph(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const version = process.env.WHATSAPP_API_VERSION || "v26.0";
  const appId = process.env.NEXT_PUBLIC_META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  const businessId = process.env.META_BUSINESS_ID?.trim();
  const systemUserId = process.env.META_SYSTEM_USER_ID?.trim();
  const systemToken = process.env.META_SYSTEM_USER_ACCESS_TOKEN?.trim();
  const adminToken =
    process.env.META_ADMIN_SYSTEM_USER_ACCESS_TOKEN?.trim() || systemToken || null;

  const result: any = {
    checkedAt: new Date().toISOString(),
    graphVersion: version,
    app: { configured: Boolean(appId && appSecret), reachable: false, name: null, error: null },
    providerToken: {
      configured: Boolean(systemToken),
      valid: null,
      expiresAt: null,
      scopes: [] as string[],
      hasBusinessManagement: false,
      hasWhatsAppManagement: false,
      hasWhatsAppMessaging: false,
      error: null,
    },
    providerBusiness: {
      configured: Boolean(businessId),
      reachable: null,
      name: null,
      systemUserFound: null,
      error: null,
    },
  };

  if (!appId || !appSecret) {
    result.app.error = "Meta App ID or App Secret is missing.";
    return NextResponse.json(result);
  }

  const appAccessToken = `${appId}|${appSecret}`;

  try {
    const app = await graph(
      `https://graph.facebook.com/${version}/${encodeURIComponent(appId)}?fields=id,name&access_token=${encodeURIComponent(appAccessToken)}`
    );
    if (app.ok && String(app.data?.id || "") === String(appId)) {
      result.app.reachable = true;
      result.app.name = app.data?.name || null;
    } else {
      result.app.error = app.data?.error?.message || "Meta did not validate the configured app.";
    }
  } catch {
    result.app.error = "Could not reach Meta to validate the app.";
  }

  if (systemToken) {
    try {
      const debug = await graph(
        `https://graph.facebook.com/${version}/debug_token?input_token=${encodeURIComponent(systemToken)}&access_token=${encodeURIComponent(appAccessToken)}`
      );
      if (debug.ok) {
        const d = debug.data?.data || {};
        const scopes = Array.isArray(d.scopes) ? d.scopes.map(String) : [];
        result.providerToken.valid = d.is_valid === true;
        result.providerToken.expiresAt = d.expires_at
          ? new Date(Number(d.expires_at) * 1000).toISOString()
          : null;
        result.providerToken.scopes = scopes;
        result.providerToken.hasBusinessManagement = scopes.includes("business_management");
        result.providerToken.hasWhatsAppManagement = scopes.includes("whatsapp_business_management");
        result.providerToken.hasWhatsAppMessaging = scopes.includes("whatsapp_business_messaging");
        if (!d.is_valid) result.providerToken.error = "Configured provider system-user token is not valid.";
      } else {
        result.providerToken.valid = false;
        result.providerToken.error = debug.data?.error?.message || "Could not inspect provider token.";
      }
    } catch {
      result.providerToken.valid = false;
      result.providerToken.error = "Could not reach Meta to inspect provider token.";
    }
  }

  if (businessId && adminToken) {
    try {
      const business = await graph(
        `https://graph.facebook.com/${version}/${encodeURIComponent(businessId)}?fields=id,name`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      if (business.ok) {
        result.providerBusiness.reachable = true;
        result.providerBusiness.name = business.data?.name || null;
      } else {
        result.providerBusiness.reachable = false;
        result.providerBusiness.error = business.data?.error?.message || "Provider Business ID is not accessible with the configured token.";
      }

      if (systemUserId) {
        const users = await graph(
          `https://graph.facebook.com/${version}/${encodeURIComponent(businessId)}/system_users`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        if (users.ok) {
          const rows = Array.isArray(users.data?.data) ? users.data.data : [];
          result.providerBusiness.systemUserFound = rows.some(
            (row: any) => String(row?.id || "") === String(systemUserId)
          );
        } else {
          result.providerBusiness.systemUserFound = false;
          result.providerBusiness.error =
            result.providerBusiness.error || users.data?.error?.message || "Could not list provider system users.";
        }
      }
    } catch {
      result.providerBusiness.reachable = false;
      result.providerBusiness.error = "Could not reach Meta to validate the provider business.";
    }
  }

  return NextResponse.json(result);
}
