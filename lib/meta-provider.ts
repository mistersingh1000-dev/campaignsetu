type ProvisionResult = {
  enabled: boolean;
  systemUserAssigned: boolean | null;
  creditLineAttached: boolean | null;
  errors: string[];
};

function enabled(name: string): boolean {
  return ["1", "true", "yes", "on"].includes(String(process.env[name] || "").toLowerCase());
}

function metaVersion(): string {
  return process.env.WHATSAPP_API_VERSION || "v26.0";
}

async function graphJson(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export function providerModeEnabled(): boolean {
  return enabled("META_PROVIDER_MODE_ENABLED");
}

export function providerCreditLineEnabled(): boolean {
  return enabled("META_PROVIDER_CREDIT_LINE_ENABLED");
}

export function providerMessagingToken(): string | null {
  return providerModeEnabled() ? process.env.META_SYSTEM_USER_ACCESS_TOKEN?.trim() || null : null;
}

export function providerAdminToken(): string | null {
  if (!providerModeEnabled()) return null;
  return (
    process.env.META_ADMIN_SYSTEM_USER_ACCESS_TOKEN?.trim() ||
    process.env.META_SYSTEM_USER_ACCESS_TOKEN?.trim() ||
    null
  );
}

export async function provisionProviderAccess(wabaId: string): Promise<ProvisionResult> {
  if (!providerModeEnabled()) {
    return {
      enabled: false,
      systemUserAssigned: null,
      creditLineAttached: null,
      errors: [],
    };
  }

  const version = metaVersion();
  const systemUserId = process.env.META_SYSTEM_USER_ID;
  const adminToken = providerAdminToken();
  const messagingToken = providerMessagingToken();
  const providerBusinessId = process.env.META_BUSINESS_ID;
  const errors: string[] = [];
  let systemUserAssigned = false;
  let creditLineAttached: boolean | null = null;

  if (!systemUserId || !adminToken || !messagingToken || !providerBusinessId) {
    return {
      enabled: true,
      systemUserAssigned: false,
      creditLineAttached: providerCreditLineEnabled() ? false : null,
      errors: [
        "Provider mode is enabled but META_BUSINESS_ID, META_SYSTEM_USER_ID, META_SYSTEM_USER_ACCESS_TOKEN or the provider admin token is missing.",
      ],
    };
  }

  // Meta's Embedded Signup provider flow uses an Admin System User token to
  // assign the provider's messaging system user to the customer's WABA.
  const assignParams = new URLSearchParams({
    user: systemUserId,
    tasks: JSON.stringify(["MANAGE"]),
  });
  const assign = await graphJson(
    `https://graph.facebook.com/${version}/${encodeURIComponent(wabaId)}/assigned_users?${assignParams.toString()}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  );

  if (!assign.res.ok) {
    errors.push(
      assign.data?.error?.message ||
        "Meta rejected the provider system-user assignment for this WhatsApp Business Account."
    );
  } else {
    const verifyParams = new URLSearchParams({ business: providerBusinessId });
    const verify = await graphJson(
      `https://graph.facebook.com/${version}/${encodeURIComponent(wabaId)}/assigned_users?${verifyParams.toString()}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    if (!verify.res.ok) {
      errors.push(
        verify.data?.error?.message ||
          "The provider system-user assignment could not be verified."
      );
    } else {
      const rows = Array.isArray(verify.data?.data) ? verify.data.data : [];
      systemUserAssigned = rows.some((row: any) => String(row?.id || "") === String(systemUserId));
      if (!systemUserAssigned) {
        errors.push("Meta did not return the configured provider system user on the customer's WABA.");
      }
    }
  }

  if (providerCreditLineEnabled()) {
    creditLineAttached = false;
    const creditLineId = process.env.META_CREDIT_LINE_ID;
    if (!creditLineId) {
      errors.push("Provider credit-line mode is enabled but META_CREDIT_LINE_ID is missing.");
    } else {
      const waba = await graphJson(
        `https://graph.facebook.com/${version}/${encodeURIComponent(wabaId)}?fields=id,currency`,
        { headers: { Authorization: `Bearer ${messagingToken}` } }
      );
      const currency = waba.data?.currency;
      if (!waba.res.ok || !currency) {
        errors.push(
          waba.data?.error?.message || "Could not read the customer's WABA currency for credit-line setup."
        );
      } else {
        const creditParams = new URLSearchParams({
          waba_id: wabaId,
          waba_currency: String(currency),
        });
        const credit = await graphJson(
          `https://graph.facebook.com/${version}/${encodeURIComponent(creditLineId)}/whatsapp_credit_sharing_and_attach?${creditParams.toString()}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${adminToken}` },
          }
        );
        if (!credit.res.ok) {
          errors.push(
            credit.data?.error?.message || "Meta rejected the provider credit-line attachment."
          );
        } else {
          creditLineAttached = true;
        }
      }
    }
  }

  return {
    enabled: true,
    systemUserAssigned,
    creditLineAttached,
    errors,
  };
}
